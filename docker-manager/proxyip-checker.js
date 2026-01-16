/**
 * ProxyIP 检测服务
 * 参考 CF-Workers-CheckProxyIP 的检测原理
 */

const net = require('net');
const http = require('http');
const https = require('https');

// 地区映射表
const REGION_MAP = {
    'HK': ['HK', '香港', 'Hong Kong', 'hongkong'],
    'TW': ['TW', '台湾', 'Taiwan'],
    'JP': ['JP', '日本', 'Japan', 'Tokyo'],
    'SG': ['SG', '新加坡', 'Singapore'],
    'US': ['US', '美国', 'United States', 'America'],
    'KR': ['KR', '韩国', 'Korea', 'Seoul'],
    'DE': ['DE', '德国', 'Germany'],
    'UK': ['GB', 'UK', '英国', 'United Kingdom', 'London'],
    'FR': ['FR', '法国', 'France', 'Paris'],
    'NL': ['NL', '荷兰', 'Netherlands', 'Amsterdam']
};

/**
 * 检测 ProxyIP 的有效性
 * @param {string} proxyIP - IP地址
 * @param {number} port - 端口号
 * @returns {Promise<Object>} 检测结果
 */
async function checkProxyIP(proxyIP, port = 443) {
    const startTime = Date.now();
    
    try {
        // 方法1：尝试连接测试
        const isConnectable = await testConnection(proxyIP, port);
        
        if (!isConnectable) {
            return {
                success: false,
                status: 'failed',
                responseTime: -1,
                error: '无法建立连接'
            };
        }
        
        // 方法2：HTTP 检测（类似 CF-Workers-CheckProxyIP）
        const httpResult = await testHTTPProxy(proxyIP, port);
        
        const responseTime = Date.now() - startTime;
        
        if (httpResult.success) {
            // 获取IP地理位置信息
            const geoInfo = await getIPInfo(proxyIP);
            
            return {
                success: true,
                status: 'active',
                responseTime,
                region: geoInfo.region,
                country: geoInfo.country,
                isp: geoInfo.isp,
                city: geoInfo.city,
                latitude: geoInfo.latitude,
                longitude: geoInfo.longitude
            };
        } else {
            return {
                success: false,
                status: 'failed',
                responseTime,
                error: httpResult.error || '代理测试失败'
            };
        }
        
    } catch (error) {
        return {
            success: false,
            status: 'failed',
            responseTime: -1,
            error: error.message || '检测异常'
        };
    }
}

/**
 * 测试 TCP 连接
 */
async function testConnection(host, port, timeout = 5000) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        let isResolved = false;
        
        const cleanup = () => {
            if (!isResolved) {
                isResolved = true;
                socket.destroy();
            }
        };
        
        socket.setTimeout(timeout);
        
        socket.on('connect', () => {
            if (!isResolved) {
                isResolved = true;
                socket.destroy();
                resolve(true);
            }
        });
        
        socket.on('timeout', () => {
            cleanup();
            resolve(false);
        });
        
        socket.on('error', () => {
            cleanup();
            resolve(false);
        });
        
        try {
            socket.connect(port, host);
        } catch (e) {
            cleanup();
            resolve(false);
        }
    });
}

/**
 * HTTP 代理测试（模拟 CF-Workers-CheckProxyIP 的方法）
 */
async function testHTTPProxy(proxyIP, port) {
    return new Promise((resolve) => {
        const options = {
            hostname: proxyIP,
            port: port,
            path: '/cdn-cgi/trace',
            method: 'GET',
            headers: {
                'Host': 'speed.cloudflare.com',
                'User-Agent': 'ProxyIP-Checker/1.0'
            },
            timeout: 10000
        };
        
        const protocol = port === 443 ? https : http;
        
        const req = protocol.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                // 检查是否是 Cloudflare 的响应
                const isCloudflare = data.includes('cloudflare') || 
                                   data.includes('colo=') ||
                                   res.headers['cf-ray'] !== undefined;
                
                // 即使是 400 错误，如果是 Cloudflare 返回的也算成功
                const isExpectedError = res.statusCode === 400 && 
                                       data.includes('Bad Request') &&
                                       data.includes('HTTPS');
                
                if (isCloudflare || isExpectedError) {
                    resolve({
                        success: true,
                        statusCode: res.statusCode
                    });
                } else {
                    resolve({
                        success: false,
                        error: `Invalid response: ${res.statusCode}`
                    });
                }
            });
        });
        
        req.on('error', (error) => {
            resolve({
                success: false,
                error: error.message
            });
        });
        
        req.on('timeout', () => {
            req.destroy();
            resolve({
                success: false,
                error: 'Request timeout'
            });
        });
        
        req.end();
    });
}

/**
 * 获取IP地理位置信息
 */
async function getIPInfo(ip) {
    return new Promise((resolve) => {
        const options = {
            hostname: 'ip-api.com',
            port: 80,
            path: `/json/${ip}?lang=zh-CN&fields=status,country,countryCode,region,regionName,city,lat,lon,isp,org`,
            method: 'GET',
            timeout: 5000
        };
        
        const req = http.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const info = JSON.parse(data);
                    
                    if (info.status === 'success') {
                        // 识别地区代码
                        const region = detectRegion(info.countryCode, info.city, info.regionName);
                        
                        resolve({
                            country: info.country || info.countryCode,
                            region: region,
                            city: info.city,
                            isp: info.isp || info.org,
                            latitude: info.lat,
                            longitude: info.lon
                        });
                    } else {
                        resolve(getDefaultGeoInfo());
                    }
                } catch (e) {
                    resolve(getDefaultGeoInfo());
                }
            });
        });
        
        req.on('error', () => {
            resolve(getDefaultGeoInfo());
        });
        
        req.on('timeout', () => {
            req.destroy();
            resolve(getDefaultGeoInfo());
        });
        
        req.end();
    });
}

/**
 * 识别地区
 */
function detectRegion(countryCode, city = '', regionName = '') {
    const searchText = `${countryCode} ${city} ${regionName}`.toLowerCase();
    
    for (const [region, keywords] of Object.entries(REGION_MAP)) {
        for (const keyword of keywords) {
            if (searchText.includes(keyword.toLowerCase())) {
                return region;
            }
        }
    }
    
    return countryCode || 'UNKNOWN';
}

/**
 * 默认地理信息
 */
function getDefaultGeoInfo() {
    return {
        country: null,
        region: null,
        city: null,
        isp: null,
        latitude: null,
        longitude: null
    };
}

/**
 * 批量检测 ProxyIP
 */
async function batchCheckProxyIPs(proxyList, concurrency = 3) {
    const results = [];
    
    for (let i = 0; i < proxyList.length; i += concurrency) {
        const batch = proxyList.slice(i, i + concurrency);
        const batchResults = await Promise.all(
            batch.map(proxy => checkProxyIP(proxy.address, proxy.port))
        );
        
        results.push(...batchResults.map((result, index) => ({
            ...proxyList[i + index],
            ...result
        })));
    }
    
    return results;
}

module.exports = {
    checkProxyIP,
    batchCheckProxyIPs,
    getIPInfo,
    detectRegion
};
