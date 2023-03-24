import Events from "./events.js";

const SHOPEE_BASE_DOMAIN = 'seller.shopee.com.my'
const SHOPEE_CF_BASE_DOMAIN = 'cf.shopee.com.my'

const ES_BASE_URL = 'http://127.0.0.1:5566'

// 获取cookie
function getCookie(callback) {
    chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
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
    });
}

const yesterday = () => {
    let yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    return yesterday
}

const startOfyesterday = () => {
    let yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    let yesterdayStart = startOfDay(yesterday)
    // console.log('startOfyesterday', yesterdayStart)
    return yesterdayStart
}

const endOfYesterday = () => {
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
function exportFile(type, force, callback) {
    let _yesterday = yesterday()
    let y_m_d = [_yesterday.getFullYear(), _yesterday.getMonth(), _yesterday.getDay()].join("_")
    let index_name = `index_${type}_${y_m_d}`
    chrome.storage.sync.get(index_name, function (boolVal) {
        // 昨日数据已经上传过,并且没有指定强制上传则退出
        if (boolVal && !force) {
            Events.dispatch(Events.UPLOADED_ERROR, type, _yesterday.getFullYear(), _yesterday.getMonth(), _yesterday.getDay())
        } else {
            getCookie((cookies) => {
                fetch(`https://${SHOPEE_BASE_DOMAIN}/api/marketing/v3/pas/report_file/export/?report_type=${type}&start_time=${startOfyesterday()}&end_time=${endOfYesterday()}&SPC_CDS=${cookies.SPC_CDS}&SPC_CDS_VER=2`)
                    .then(response => response.json())
                    .then(data => {
                        console.log('fetch /api/marketing/v3/pas/report_file/export: ', data)
                        if (data.code == 0) {
                            let arrayKey = `array${type}`
                            let res = {"fileid": data.data.fileid, "filename": data.data.file_name}
                            chrome.storage.sync.get(arrayKey, function (result) {
                                if (!result.array0) {
                                    result.array0 = []
                                }
                                if (result.array0.length > 10) {
                                    result.array0 = result.array0.reverse().slice(0, 8)
                                }
                                result.array0.push(res)
                                // 保存最新的10条下载记录
                                chrome.storage.sync.set({arrayKey: result.array0}, function () {
                                })
                                callback(res)
                                Events.dispatch(Events.EXPORT_FILE, type, res)
                            });
                        } else {
                            Events.dispatch(Events.EXPORT_FILE_ERROR, data.message)
                        }

                    })
            })
        }
    })


}

// 检查文件是否已生成
function checkFile(type, res, callback) {
    getCookie((cookies) => {
        const check_status = () => {
            fetch(`https://${SHOPEE_BASE_DOMAIN}/api/marketing/v3/pas/report_file/batch/?fileid_list=[${res.fileid}]&SPC_CDS=${cookies.SPC_CDS}&SPC_CDS_VER=2`)
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

                })
        }
        // 延迟两秒后执行检查文件是否已生成
        setTimeout(check_status, 2000);

    })
}

// 下载文件
function downloadFile(type, res, callback) {
    getCookie((cookies) => {
        fetch(`https://${SHOPEE_BASE_DOMAIN}/api/marketing/v3/pas/report_file/?SPC_CDS=${cookies.SPC_CDS}&SPC_CDS_VER=2&fileid=${res.fileid}`)
            .then(response => response.arrayBuffer())
            .then(arrayBuf => {
                console.log('fetch /api/marketing/v3/pas/report_file: ', arrayBuf.byteLength)
                const textDecoder = new TextDecoder('utf-8');
                const textContent = textDecoder.decode(arrayBuf);
                console.log('文件内容', textContent);
                callback(textContent)
                Events.dispatch(Events.DOWNLOAD_FILE, textContent)
            })

    })
}

// 补充下载下来的csv文件，比如补充图片等信息
function fillContent(type, res, content, callback) {
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
            fetch(`https://${SHOPEE_BASE_DOMAIN}/api/marketing/v3/pas/homepage/?SPC_CDS=${cookies.SPC_CDS}&SPC_CDS_VER=2&campaign_type=cpc_homepage&campaign_state=all&sort_key=performance&sort_direction=1&search_content=&start_time=${startOfyesterday()}&end_time=${endOfYesterday()}&offset=${offset}&limit=${limit}`)
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
                })
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
function uploadArray(type, titleArray, headerArray, newDataArray) {
    console.log('titleArray', titleArray)
    let esDatas = newDataArray.map(data => {
        let shopId = titleArray[4][1].replace('\r', '')
        let _yesterday = yesterday()
        let line = {
            'id': `${shopId}_${_yesterday.getFullYear()}_${_yesterday.getMonth()}_${_yesterday.getDay()}_${data[0]}`,
            'shopId': shopId,
            'startTime': new Date(startOfyesterday() * 1000),
            'endTime': new Date(endOfYesterday() * 1000),
            'year': _yesterday.getFullYear(),
            'month': _yesterday.getMonth(),
            'day': _yesterday.getDay()
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
    fetch(`${ES_BASE_URL}${path}`, {
        method: 'POST',
        body: JSON.stringify(esDatas),
        headers: {
            'Content-Type': 'application/json'
        }
    })
        .then(response => response.json())
        .then(data => {
            console.log(`post-response ${path}: `, data)
            Events.dispatch(Events.UPLOAD_COMPLETE, type, data)
        })
        .catch(error => console.error(error));
}

// 发送消息给前端
function sendToFront(type, message) {
    chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {
            type: type, message: message
        });
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
    exportFile(type, force, (res) => {
        // 检查文件是否生成
        checkFile(type, res, () => {
            // 下载文件
            downloadFile(type, res, (content) => {
                // 补全商品图
                fillContent(type, res, content, (titleArray, headerArray, newDataArray) => {
                    uploadArray(type, titleArray, headerArray, newDataArray)
                })
            })
        })
    })
}

export {SHOPEE_BASE_DOMAIN, yesterday, fetchFile, sendToFront, sendToNotify}