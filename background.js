// v3中文开发文档: https://doc.yilijishu.info/chrome/getstarted.html

const SHOPEE_BASE_DOMAIN = 'seller.shopee.com.my'
const SHOPEE_CF_BASE_DOMAIN = 'cf.shopee.com.my'

const ES_BASE_URL = 'https://shopee-collector-aws.yj2025.com'

/**
 * 建议通过事件通知机制做跟业务无关的通知、展示等动作。
 */
const Events = {
    /**
     * args: [cookies]
     */
    GET_COOKIES: 'getCookies',
    /**
     * args: [type, fileObj]
     */
    EXPORT_FILE: '_exportFile',
    /**
     * args: [type, fileObj, status]
     */
    CHECK_FILE: '_checkFile',
    /**
     * args: [type, errMsg]
     */
    EXPORT_FILE_ERROR: 'exportFileError',
    /**
     * args: [errMsg]
     */
    CHECK_FILE_ERROR: 'checkFileError',
    /**
     * args: [textContent]
     */
    DOWNLOAD_FILE: '_downloadFile',
    /**
     * args: [offset, limit, offsetDatas]
     */
    OFFSET_MARKETING_DATA: 'offsetMarketingData',
    /**
     * args: [datas]
     */
    MARKETING_DATA: 'marketingData',
    /**
     * args: [errMsg]
     */
    MARKETING_DATA_ERROR: 'marketingDataError',
    /**
     * args: [titleArray, headerArray, newDataArray]
     */
    GENERATE_DATA_ARRAY: 'generateDataArray',
    /**
     * args: [type, status, count]
     */
    UPLOAD_COMPLETE: 'uploadComplete',
    /**
     * args: [url, error]
     */
    NETWORK_ERROR: 'networkError',
    listeners: {},
    /**
     * 触发事件
     * @param eventName 事件名
     * @param args 传参
     */
    dispatch(eventName, ...args) {
        let events = this.listeners[eventName]
        if (events && events instanceof Array) {
            events.forEach(event => {
                event(args)
            })
        }
    },
    /**
     * 事件监听
     * @param eventName 事件名
     * @param listener 监听方法
     */
    listener(eventName, listener) {
        let events = this.listeners[eventName]
        if (!events) {
            events = []
        }
        events.push(listener)
        this.listeners[eventName] = events
    },
    /**
     * 移除事件监听
     * @param eventName 事件名
     */
    remove(eventName) {
        if (!this.listeners[eventName]) {
            return;
        }
        this.listeners[eventName] = [];
    },
}


// 获取cookie
function getCookie(callback) {
    chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
        if (tabs && tabs.length > 0) {
            var domain = new URL(tabs[0].url).hostname;
            // console.log(domain); // 输出当前页面的域名
            chrome.cookies.getAll({}, function (cookie) {
                let cookies = {}
                for (let i = 0; i < cookie.length; i++) {
                    if (cookie[i].domain == domain) {
                        // console.log('cookie', cookie[i])
                        cookies[cookie[i]['name']] = cookie[i]['value']
                    }
                }
                callback(cookies)
                Events.dispatch(Events.GET_COOKIES, cookies)
                // console.log('cookies: ', cookies)
            });
        }
    });
}

function yesterday() {
    let yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    return yesterday
}

function yesterdayMonth() {
    return yesterday().getMonth() + 1
}

function yesterdayYear() {
    return yesterday().getFullYear()
}

function yesterdayDay() {
    return yesterday().getDate()
}

function startOfyesterday() {
    let yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    let yesterdayStart = startOfDay(yesterday)
    // console.log('startOfyesterday', yesterdayStart)
    return yesterdayStart
}

function endOfYesterday() {
    let yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    let yesterdayStart = startOfDay(yesterday)
    let yesterdayEnd = startOfDay(new Date()) - 1
    // console.log('yesterdayEnd', yesterdayEnd)
    return yesterdayEnd
}

function startOfDay(date) {
    // 将时分秒设为0
    date.setHours(0);
    date.setMinutes(0);
    date.setSeconds(0);
    date.setMilliseconds(0);
    // 取得时间戳
    let timestamp = Math.floor(date.getTime() / 1000);
    return timestamp
}


// 请求导出数据文件
function _exportFile(type, force, callback) {
    getCookie((cookies) => {
        const url = `https://${SHOPEE_BASE_DOMAIN}/api/marketing/v3/pas/report_file/export/?report_type=${type}&start_time=${startOfyesterday()}&end_time=${endOfYesterday()}&SPC_CDS=${cookies.SPC_CDS}&SPC_CDS_VER=2`
        fetch(url)
            .then(response => response.json())
            .then(data => {
                console.log('fetch /api/marketing/v3/pas/report_file/export: ', data)
                if (data.code == 0) {
                    let res = {"fileid": data.data.fileid, "filename": data.data.file_name}
                    callback(res)
                    Events.dispatch(Events.EXPORT_FILE, type, res)
                } else {
                    Events.dispatch(Events.EXPORT_FILE_ERROR, type, data.message)
                }
            }).catch(error => Events.dispatch(Events.NETWORK_ERROR, url, error))
    })
}

// 检查文件是否已生成
function _checkFile(type, res, callback) {
    getCookie((cookies) => {
        const check_status = () => {
            const url = `https://${SHOPEE_BASE_DOMAIN}/api/marketing/v3/pas/report_file/batch/?fileid_list=[${res.fileid}]&SPC_CDS=${cookies.SPC_CDS}&SPC_CDS_VER=2`
            fetch(url)
                .then(response => response.json())
                .then(data => {
                    console.log('fetch /api/marketing/v3/pas/report_file/batch: ', data)
                    if (data.code == 0) {
                        let down_status = data.data[0].file_status
                        if (down_status == 0) {
                            // 文件已生成
                            callback()
                        } else {
                            // 如果文件未生成继续延迟两秒检查状态
                            setTimeout(check_status, 2000);
                        }
                        Events.dispatch(Events.CHECK_FILE, type, res, down_status)
                    } else {
                        Events.dispatch(Events.CHECK_FILE_ERROR, data.message)
                    }

                }).catch(error => Events.dispatch(Events.NETWORK_ERROR, url, error))
        }
        // 延迟两秒后执行检查文件是否已生成
        setTimeout(check_status, 2000);

    })
}

// 下载文件
function _downloadFile(type, res, callback) {
    getCookie((cookies) => {
        const url = `https://${SHOPEE_BASE_DOMAIN}/api/marketing/v3/pas/report_file/?SPC_CDS=${cookies.SPC_CDS}&SPC_CDS_VER=2&fileid=${res.fileid}`
        fetch(url)
            .then(response => response.arrayBuffer())
            .then(arrayBuf => {
                console.log('fetch /api/marketing/v3/pas/report_file: ', arrayBuf.byteLength)
                const textDecoder = new TextDecoder('utf-8');
                const textContent = textDecoder.decode(arrayBuf);
                // console.log('文件内容', textContent);
                callback(textContent)
                Events.dispatch(Events.DOWNLOAD_FILE, textContent)
            }).catch(error => Events.dispatch(Events.NETWORK_ERROR, url, error))

    })
}

// 补充下载下来的csv文件，比如补充图片等信息
function _fillContent(type, res, content, callback) {
    const splitColumns = (lines) => {
        let array = []
        lines.forEach((line, index) => {
            array[index] = line.split(',')
        })
        return array
    }
    let lines = content.split("\n");
    let array = splitColumns(lines)
    let titleArray = array.slice(0, 6)
    let headerArray = [array[6]]
    let dataArray = array.slice(7, lines.length)
    console.log(titleArray, headerArray, dataArray)

    headerArray[0].splice(4, 0, "商品图片");

    const fill = (marketingData) => {
        let newDataArray = []
        dataArray.forEach(lineArray => {
            let marketingItem = marketingData.filter(data => data.product.itemid == lineArray[3])
            if (marketingItem && marketingItem[0] && marketingItem[0].product.images) {
                // 获取商品图片的第一个图片
                let productImgUrl = `https://${SHOPEE_CF_BASE_DOMAIN}/file/${marketingItem[0].product.images.split(',')[0]}`
                lineArray.splice(4, 0, encodeURIComponent(productImgUrl))
            } else {
                // 注意最后一行为 空串 不补全
                if (lineArray && lineArray.length > 1) {
                    lineArray.splice(4, 0, 'N/A')
                }
            }
            newDataArray.push(lineArray)
        })
        let newArray = [].concat(titleArray, headerArray, newDataArray)
        console.log('补充后数组信息:', newArray)
        callback(titleArray, headerArray, newDataArray)
        Events.dispatch(Events.GENERATE_DATA_ARRAY, titleArray, headerArray, newDataArray)
    }

    // 循环分页获取所有广告
    let is_fetch_completed = false
    let marketingData = []
    const fetchMarketingData = (offset, limit) => {
        getCookie((cookies) => {
            const url = `https://${SHOPEE_BASE_DOMAIN}/api/marketing/v3/pas/homepage/?SPC_CDS=${cookies.SPC_CDS}&SPC_CDS_VER=2&campaign_type=cpc_homepage&campaign_state=all&sort_key=performance&sort_direction=1&search_content=&start_time=${startOfyesterday()}&end_time=${endOfYesterday()}&offset=${offset}&limit=${limit}`
            fetch(url)
                .then(response => response.json())
                .then(value => {
                    console.log('fetch /api/marketing/v3/pas/homepage: ', value)
                    if (value.code == 0) {
                        marketingData = marketingData.concat(value.data.campaign_ads_list)
                        Events.dispatch(Events.OFFSET_MARKETING_DATA, offset, limit, value.data.campaign_ads_list)
                        let totalNum = value.data.total_count
                        if (offset + value.data.campaign_ads_list.length >= totalNum) {
                            is_fetch_completed = true
                        }
                        if (!is_fetch_completed) {
                            fetchMarketingData(offset + limit, limit)
                            return
                        }
                        fill(marketingData)
                        Events.dispatch(Events.MARKETING_DATA, marketingData)
                    } else {
                        Events.dispatch(Events.MARKETING_DATA_ERROR, value.message)
                    }
                }).catch(error => Events.dispatch(Events.NETWORK_ERROR, url, error))
        })
    }
    fetchMarketingData(0, 20)
}

const floatHeaders = (type) => {
    const floatHeaders0 = ['排序', '浏览数', '点击数', '转化', '直接转化', '每一转化的成本', '每一直接转化的成本',
        '商品已出售', '直接已售商品', '销售金额', '直接销售金额', '花费', '投资产出比', '直接投资产出比']

    const floatHeaders1 = ['排序', '浏览数', '点击数', '平均排名', '转化', '直接转化', '每点击成本', '每一转化的成本',
        '每一直接转化的成本', '商品已出售', '直接已售商品', '销售金额', '直接销售金额', '花费', '投资产出比', '直接投资产出比']
    return type == 0 ? floatHeaders0 : floatHeaders1
}

const encodeHeaders = () => {
    return ['商品图片']
}

// 上传数据到云
function _uploadArray(type, titleArray, headerArray, newDataArray) {
    console.log('titleArray', titleArray)
    let esDatas = newDataArray.map(data => {
        let shopId = titleArray[4][1].replace('\r', '')
        let line = {
            'id': `${shopId}_${yesterdayYear()}_${yesterdayMonth()}_${yesterdayDay()}_${data[0]}`,
            'shopId': shopId,
            'startTime': new Date(startOfyesterday() * 1000),
            'endTime': new Date(endOfYesterday() * 1000),
            'year': yesterdayYear(),
            'month': yesterdayMonth(),
            'day': yesterdayDay()
        }
        data.forEach((v, index) => {
            let header = headerArray[0][index]
            let value = v.replace('\r', '')
            if (floatHeaders(type).includes(header)) {
                line[header] = Number(value)
            } else if (encodeHeaders().includes(header)) {
                line[header] = decodeURIComponent(value)
            } else {
                line[header] = value
            }
        })
        // console.log('line: ', line)
        return line
    })
    console.log('esDatas', esDatas)
    let path = type == 0 ? '/ads/collecte-overall' : '/ads/collecte-keyword'
    let _chunkArray = chunkArray(esDatas, 200)
    _chunkArray.forEach((array, index) => {
        fetch(`${ES_BASE_URL}${path}`, {
            method: 'POST',
            body: JSON.stringify(array),
            headers: {
                'Content-Type': 'application/json'
            }
        })
            .then(response => response.json())
            .then(data => {
                console.log(`分批上传 ${index} ${path}: `, data)
                if (index == _chunkArray.length - 1) {
                    console.log(`最后一批上传完毕 ${index} ${path}: `, data)
                    Events.dispatch(Events.UPLOAD_COMPLETE, type, 'success', esDatas.length)
                }
            })
            .catch(error => Events.dispatch(Events.NETWORK_ERROR, url, error))
    })
}

function chunkArray(arr, chunkSize) {
    const chunkedArr = [];
    for (let i = 0; i < arr.length; i += chunkSize) {
        const chunk = arr.slice(i, i + chunkSize);
        chunkedArr.push(chunk);
    }
    return chunkedArr;
}

// 发送消息给前端
function sendToFront(type, message, data = null) {
    chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
        if (tabs && tabs.length > 0) {
            console.log('tabs', tabs)
            chrome.tabs.sendMessage(tabs[0].id, {
                'type': type, 'message': message, 'data': data
            });
        }
    });
}

// 发送通知到chrome浏览器
function sendToNotify(message) {
    chrome.notifications.create({
        type: 'basic',
        title: '虾皮广告收集器',
        message: message,
        iconUrl: './img/icon-48.png'
    })
}

// 下载指定类型的昨日数据
function fetchFile(type, force) {
    // 导出文件
    _exportFile(type, force, (res) => {
        // 检查文件是否生成
        _checkFile(type, res, () => {
            // 下载文件
            _downloadFile(type, res, (content) => {
                // 补全商品图
                _fillContent(type, res, content, (titleArray, headerArray, newDataArray) => {
                    _uploadArray(type, titleArray, headerArray, newDataArray)
                })
            })
        })
    })
}

function getTypename(type) {
    let typename = type == 0 ? '综合数据' : '关键字数据'
    return typename
}

function getIndexName(type) {
    let y_m_d = [yesterdayYear(), yesterdayMonth(), yesterdayDay()].join("_")
    let index_name = `index_${type}_${y_m_d}`
    return index_name
}


// 监听文件导出事件回调
Events.listener(Events.EXPORT_FILE, ([type, file_res]) => {
    let message = `导出${getTypename(type)}` + ":" + file_res.fileid + '/' + file_res.filename
    this.sendToFront('success', message)
})

// 监听文件生成检查状态回调
Events.listener(Events.CHECK_FILE, ([type, res, status]) => {
    if (status == 0) {
        // 文件已生成
        this.sendToFront('success', `${getTypename(type)}: ${res.fileid}/${res.filename} 已经生成`)
    }
})

// 监听导出失败事件
Events.listener(Events.EXPORT_FILE_ERROR, ([type, message]) => {
    this.sendToFront('error', `导出${getTypename(type)}失败: ${message}`)
})

// 监听检查失败事件
Events.listener(Events.CHECK_FILE_ERROR, (message) => {
    this.sendToFront('error', `检查失败: ${message}`)
})

// 监听文件下载读取到内容事件
Events.listener(Events.DOWNLOAD_FILE, (content) => {
    // this.sendToFront('info', `文件内容: ${content}`)
})

// 监听分段获取广告列表
Events.listener(Events.OFFSET_MARKETING_DATA, ([offset, limit, datas]) => {
    this.sendToFront('info', `获取广告列表: offset:${offset} limit:${limit} 共${datas.length}条`)
})

// 监听csv文件补全后的内容事件
Events.listener(Events.GENERATE_DATA_ARRAY, ([titleArray, headerArray, newDataArray]) => {
    this.sendToFront('info', `csv文件补全完成，共 ${newDataArray.length} 条`)
    // let newArray = [].concat(titleArray, headerArray, newDataArray)
    // 准备将数据整理成 csv 格式
    // const csvContent = "data:text/csv;charset=utf-8," + newArray.map(e => e.join(",")).join("\n");
    // console.log("生成新的csv内容", csvContent)
    // chrome.downloads.download({
    //     url: URL.createObjectURL(new Blob([csvContent])),
    //     filename: "datas.csv",
    //     saveAs: true
    // }, function (downloadId) {
    //     console.log("Downloaded file with ID: " + downloadId);
    // }, function () {
    //     console.error("Failed to download");
    // })
})

// 上传成功回调
Events.listener(Events.UPLOAD_COMPLETE, ([type, status, count]) => {
    let index_name = getIndexName(type)
    let typename = getTypename(type)
    let message = `${typename} ${getIndexName(type)}: 已成功上传服务器 ${count} 条`
    if (status == 'exist') {
        message = `昨日${typename}数据已上传过: ${getIndexName(type)} ${count} 条`
    }
    console.log('upload_complete: ', message)
    this.sendToFront('completed', message, type)
})

// 请求失败回调
Events.listener(Events.NETWORK_ERROR, ([url, error]) => {
    this.sendToFront('error', `请求地址 ${url}失败: ${error.message}`)
})

// 应用安装完成后提示
chrome.runtime.onInstalled.addListener(function (details) {
    if (details.reason == "install") {
        // chrome.tabs.create({url: "welcome.html"});
        chrome.notifications.create({
            type: 'basic',
            title: '虾皮广告收集器',
            message: '您已经成功安装[虾皮广告收集器插件]',
            iconUrl: './img/icon-48.png'
        })
    }
});

// 页面打开完成后触发事件
chrome.webNavigation.onCompleted.addListener(function (details) {
    if (details.frameId === 0 && details.url.includes(this.SHOPEE_BASE_DOMAIN)) {
        // 发送前端通知
        this.sendToFront("success", "后台广告自动抓取已开始")
        this.sendToNotify('虾皮广告插件已成功加载!')
    }
});


// 接收前端发送过来的消息
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    console.log('收到前台消息:', request.message)
    if (request.type == 'fetch') {
        this.sendToFront('info', `开始收集${getTypename(request.data)}数据`)
        this.fetchFile(request.data, false)
    }
})


chrome.storage.onChanged.addListener(function (changes, namespace) {
    for (let [key, {oldValue, newValue}] of Object.entries(changes)) {
        console.log(
            `Storage key "${key}" in namespace "${namespace}" changed.`,
            `Old value was "${oldValue}", new value is "${newValue}".`
        );
    }
})