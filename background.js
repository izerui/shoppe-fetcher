// v3中文开发文档: https://doc.yilijishu.info/chrome/getstarted.html

const SHOPEE_BASE_DOMAIN = 'seller.shopee.com.my'
const SHOPEE_CF_BASE_DOMAIN = 'cf.shopee.com.my'

const ES_BASE_URL = 'https://shopee-collector-aws.yj2025.com'

/**
 * 建议通过事件通知机制做跟业务无关的通知、展示等动作。
 */
const Events = {
    INFO_MESSAGE: 'infoMessage',
    WARN_MESSAGE: 'warnMessage',
    SUCCESS_MESSAGE: 'successMessage',
    ERROR_MESSAGE: 'errorMessage',
    listeners: {}, /**
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
    }, /**
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
    }, /**
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

function today(offset) {
    let date = new Date()
    date = new Date(date.getTime() + offset * 86400000)
    return date
}

function startOfDate(date) {
    let startDate = new Date(date.getTime())
    // 将时分秒设为0
    startDate.setHours(0);
    startDate.setMinutes(0);
    startDate.setSeconds(0);
    startDate.setMilliseconds(0);
    // 取得时间戳
    let timestamp = Math.floor(startDate.getTime() / 1000);
    return timestamp
}

function endOfDate(date) {
    let endDate = new Date(date.getTime() + 86400000)
    let timestamp = Math.floor(endDate.getTime() / 1000);
    return timestamp
}

function getYmdArray(date) {
    return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
}


// 获取cookie
function getCookie(callback) {
    chrome.cookies.getAll({}, function (cookie) {
        let cookies = {}
        for (let i = 0; i < cookie.length; i++) {
            if (cookie[i].domain == SHOPEE_BASE_DOMAIN) {
                // console.log('cookie', cookie[i])
                cookies[cookie[i]['name']] = cookie[i]['value']
            }
        }
        // 修复bug： 当获取不到cookie的时候
        if (cookies && cookies['SPC_CDS']) {
            callback(cookies)
            return
        } else {
            Events.dispatch(Events.ERROR_MESSAGE, '未获取到cookies')
            console.warn('未获取到cookies: ', cookies)
        }
    });
}

function _getShopInfo(callback) {
    getCookie((cookies) => {
        let url = `https://seller.shopee.com.my/api/v2/login/?SPC_CDS=${cookies.SPC_CDS}&SPC_CDS_VER=2`
        fetch(url)
            .then(response => response.json())
            .then(result => {
                result = Object.assign(cookies, result)
                console.log('shopInfo: ', result)
                callback(result)
            }).catch(error => console.error(error))
    })
}

// 检查次数限制
var checkCountObj = {}

// 请求导出数据文件
function _exportFile(type, date, endDate, shopInfo, callback) {
    checkCountObj = {}
    const url = `https://${SHOPEE_BASE_DOMAIN}/api/marketing/v3/pas/report_file/export/?report_type=${type}&start_time=${startOfDate(date)}&end_time=${endOfDate(date)}&SPC_CDS=${shopInfo.SPC_CDS}&SPC_CDS_VER=2`
    fetch(url)
        .then(response => response.json())
        .then(data => {
            // console.log('fetch /api/marketing/v3/pas/report_file/export: ', data)
            if (data.code == 0) {
                let res = {"fileid": data.data.fileid, "filename": data.data.file_name}
                callback(res)
                Events.dispatch(Events.SUCCESS_MESSAGE, `${getTitleTip(type, date, shopInfo)} 导出, ${res.fileid}/${res.filename}`)
            } else {
                Events.dispatch(Events.ERROR_MESSAGE, `${getTitleTip(type, date, shopInfo)} 导出失败,${data.message}, 10秒后重试...`)
                setTimeout(() => {
                    _exportFile(type, date, endDate, shopInfo, callback)
                }, 10000)
                return
            }
        }).catch(error => console.error(error))
}

// 检查文件是否已生成
function _checkFile(type, date, endDate, shopInfo, res, callback) {
    let indexName = getIndexName(type, date, shopInfo)
    const check_status = () => {
        const url = `https://${SHOPEE_BASE_DOMAIN}/api/marketing/v3/pas/report_file/batch/?fileid_list=[${res.fileid}]&SPC_CDS=${shopInfo.SPC_CDS}&SPC_CDS_VER=2`
        fetch(url)
            .then(response => response.json())
            .then(data => {
                // console.log('fetch /api/marketing/v3/pas/report_file/batch: ', data)
                let checkCount = checkCountObj[indexName]
                if (checkCount == undefined) {
                    checkCount = 0
                }
                checkCount = checkCount + 1
                checkCountObj[indexName] = checkCount
                if (data.code == 0) {
                    let down_status = data.data[0].file_status
                    let status_name = down_status == 0 ? '文件已生成' : `文件生成中第${checkCount}次检查`
                    let message = `${getTitleTip(type, date, shopInfo)} ${status_name}` // + ":" + res.fileid + '/' + res.filename
                    Events.dispatch(Events.INFO_MESSAGE, message)
                    console.log(message, data)
                    if (down_status == 0) {
                        // 文件已生成
                        callback()
                        return
                    } else if (down_status == 3) {
                        let message = `${getTitleTip(type, date, shopInfo)}文件生成失败,跳过继续下一个...`
                        Events.dispatch(Events.ERROR_MESSAGE, message)
                        console.warn(message)
                        continueUpload(type, date, endDate, shopInfo, 15000)
                        return
                    } else {
                        if (checkCount > 20) {
                            let message = `${getTitleTip(type, date, shopInfo)}文件生成检查超过20次,跳过继续下一个...`
                            Events.dispatch(Events.ERROR_MESSAGE, message)
                            console.warn(message)
                            continueUpload(type, date, endDate, shopInfo, 15000)
                            return
                        }
                        // 如果文件未生成继续延迟两秒检查状态
                        setTimeout(check_status, 2000);
                        return
                    }
                } else {
                    Events.dispatch(Events.ERROR_MESSAGE, `${getTitleTip(type, date, shopInfo)} 检查失败,${data.message}`)
                }

            }).catch(error => console.error(error))
    }
    // 延迟两秒后执行检查文件是否已生成
    setTimeout(check_status, 2000);
}

// 下载文件
function _downloadFile(type, date, endDate, shopInfo, res, callback) {
    const url = `https://${SHOPEE_BASE_DOMAIN}/api/marketing/v3/pas/report_file/?SPC_CDS=${shopInfo.SPC_CDS}&SPC_CDS_VER=2&fileid=${res.fileid}`
    fetch(url)
        .then(response => response.arrayBuffer())
        .then(arrayBuf => {
            // console.log('fetch /api/marketing/v3/pas/report_file: ', arrayBuf.byteLength)
            const textDecoder = new TextDecoder('utf-8');
            const textContent = textDecoder.decode(arrayBuf);
            // console.log('文件内容', textContent);
            callback(textContent)
        }).catch(error => console.error(error))

}

// 补充下载下来的csv文件，比如补充图片等信息
function _fillContent(type, date, endDate, shopInfo, res, content, callback) {
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
    // console.log(titleArray, headerArray, dataArray)

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
        console.log(`${getTitleTip(type, date, shopInfo)} 补充后数组信息`, newArray)
        callback(titleArray, headerArray, newDataArray)
        Events.dispatch(Events.INFO_MESSAGE, `${getTitleTip(type, date, shopInfo)} csv文件补全完成，共 ${newDataArray.length} 条`)
    }

    // 循环分页获取所有广告
    let is_fetch_completed = false
    let marketingData = []
    const fetchMarketingData = (offset, limit) => {
        const url = `https://${SHOPEE_BASE_DOMAIN}/api/marketing/v3/pas/homepage/?SPC_CDS=${shopInfo.SPC_CDS}&SPC_CDS_VER=2&campaign_type=cpc_homepage&campaign_state=all&sort_key=performance&sort_direction=1&search_content=&start_time=${startOfDate(date)}&end_time=${endOfDate(date)}&offset=${offset}&limit=${limit}`
        fetch(url)
            .then(response => response.json())
            .then(value => {
                // console.log('fetch /api/marketing/v3/pas/homepage: ', value)
                if (value.code == 0) {
                    marketingData = marketingData.concat(value.data.campaign_ads_list)
                    let totalNum = value.data.total_count
                    if (offset + value.data.campaign_ads_list.length >= totalNum) {
                        is_fetch_completed = true
                    }
                    if (!is_fetch_completed) {
                        fetchMarketingData(offset + limit, limit)
                        return
                    }
                    fill(marketingData)
                } else {
                    console.error('请求广告列表结果异常: ', url, value)
                }
            }).catch(error => console.error(error))
    }
    fetchMarketingData(0, 20)
}

function convert_num(line, prop) {
    let value = line[prop]
    if (value == 'N/A') {
        value = '0'
    }
    return Number(value)
}

function convert_rate(line, prop) {
    let value = line[prop]
    if (value == 'N/A') {
        value = '0'
    }
    value = value.replace('%', '')
    return Number(value)
}

function convert_decode(line, prop) {
    let value = line[prop]
    return decodeURIComponent(value)
}

const translations = [{code: "sort", name: "排序", convert: convert_num},
    {code: "ads_name", name: "广告名称"},
    {code: "status", name: "状态"},
    {code: "commodity_number", name: "商品编号"},
    {code: "commodity_pic_url", name: "商品图片", convert: convert_decode},
    {code: "ads_type", name: "广告类型"},
    {code: "keyword_addr", name: "关键字/展示位置"},
    {code: "matching_type", name: "匹配类型"},
    {code: "search_result", name: "搜寻结果"},
    {code: "manual_automatic", name: "手动/自动"},
    {code: "start_date", name: "开始日期"},
    {code: "end_date", name: "结束日期"},
    {code: "view_num", name: "浏览数", convert: convert_num},
    {code: "click_num", name: "点击数", convert: convert_num},
    {code: "click_rate", name: "点击率", convert: convert_rate},
    {code: "ave_ranking", name: "平均排名", convert: convert_num},
    {code: "conversion", name: "转化", convert: convert_num},
    {code: "direct_conversion", name: "直接转化", convert: convert_num},
    {code: "conversion_rate", name: "转化率", convert: convert_rate},
    {code: "direct_conversion_rate", name: "直接转化率", convert: convert_rate},
    {code: "cost_per_click", name: "每点击成本", convert: convert_num},
    {code: "cost_per_conversion", name: "每一转化的成本", convert: convert_num},
    {code: "cost_per_direct_conversion", name: "每一直接转化的成本", convert: convert_num},
    {code: "goods_sold", name: "商品已出售", convert: convert_num},
    {code: "goods_sold_directly", name: "直接已售商品", convert: convert_num},
    {code: "sales_amount", name: "销售金额", convert: convert_num},
    {code: "direct_sales_amount", name: "直接销售金额", convert: convert_num},
    {code: "cost", name: "花费", convert: convert_num},
    {code: "investment_output_ratio", name: "投资产出比", convert: convert_num},
    {code: "direct_investment_output_ratio", name: "直接投资产出比", convert: convert_num},
    {code: "cost_income_comparison", name: "成本收入对比", convert: convert_rate},
    {code: "direct_cost_income_comparison", name: "直接成本收入对比"},
    {code: "number_of_product_views", name: "商品浏览数", convert: convert_num},
    {code: "merchandise_clicks", name: "商品点击数", convert: convert_num},
    {code: "click_through_rate", name: "商品点击率", convert: convert_rate}]

// 上传数据到云
function _uploadArray(type, date, endDate, shopInfo, titleArray, headerArray, newDataArray, callback) {
    // console.log('titleArray', titleArray)
    let esDatas = newDataArray.map(data => {
        // let shopId = titleArray[4][1].replace('\r', '')
        let ymdArray = getYmdArray(date)
        let shopId = shopInfo.shopid
        let line = {
            'id': `${shopId}_${date.getFullYear()}_${date.getMonth() + 1}_${date.getDate()}_${data[0]}`,
            'shopId': shopId,
            'startTime': new Date(startOfDate(date) * 1000),
            'endTime': new Date(endOfDate(date) * 1000),
            'year': ymdArray[0],
            'month': ymdArray[1],
            'day': ymdArray[2],
            'summary_date': ymdArray.join('-')
        }
        data.forEach((v, index) => {
            let header = headerArray[0][index]
            header = header.replace('\r', '')
            let value = v.replace('\r', '')
            line[header] = value
        })
        // 字段转换
        let item = {}
        for (let prop in line) {
            let key = prop
            let value = line[prop]
            let trans = translations.filter(t => t.name == prop)
            if (trans && trans.length > 0) {
                key = trans[0].code
                if (trans[0].convert) {
                    try {
                        value = trans[0].convert(line, prop)
                    } catch (error) {
                        console.error('转换失败', line, prop, error)
                        throw error
                    }

                }
            }
            item[key] = value
        }
        // console.log('line: ', line)
        return item
    })
    console.log('esDatas', esDatas)
    let path = type == 0 ? '/ads/collecte-overall' : '/ads/collecte-keyword'
    let _chunkArray = chunkArray(esDatas, 200)
    _chunkArray.forEach((array, index) => {
        let url = `${ES_BASE_URL}${path}`
        fetch(url, {
            method: 'POST', body: JSON.stringify(array), headers: {
                'Content-Type': 'application/json'
            }
        })
            .then(response => response.json())
            .then(data => {
                console.log(`分批上传 ${index} ${path}: `, data)
                if (index == _chunkArray.length - 1) {
                    let message = `${getTitleTip(type, date, shopInfo)} 已成功上传服务器 ${esDatas.length} 条`
                    console.log(message)
                    Events.dispatch(Events.SUCCESS_MESSAGE, message)
                    callback()
                    return
                }
            })
            .catch(error => console.error(error))
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
function sendToFront(type, message) {
    chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
        if (tabs && tabs.length > 0) {
            // console.log('tabs', tabs)
            chrome.tabs.sendMessage(tabs[0].id, {
                'type': type, 'message': message
            });
        }
    });
}

// 发送通知到chrome浏览器
function sendToNotify(message) {
    chrome.notifications.create({
        type: 'basic', title: '虾皮广告收集器', message: message, iconUrl: './img/icon-48.png'
    })
}

// 收集
const execution = (type, date, endDate, shopInfo, timeout) => {
    _checkLocal(type, date, endDate, shopInfo, () => {
        let message = `${getTitleTip(type, date, shopInfo)}已经上传过, 不再重复上传`
        Events.dispatch(Events.WARN_MESSAGE, message)
        console.log(message)
        // 继续下一个类型或者继续前一天数据
        continueUpload(type, date, endDate, shopInfo, 15000)
        return
    }, () => {
        _checkServer(type, date, endDate, shopInfo, (count) => {
            // 记录上传成功状态
            _storeUploadStatus(type, date, endDate, shopInfo, count, () => {
                let message = `${getTitleTip(type, date, shopInfo)}服务器上已经存在当日数据, 不再重复上传`
                Events.dispatch(Events.WARN_MESSAGE, message)
                console.log(message)
                // 继续下一个类型或者继续前一天数据
                continueUpload(type, date, endDate, shopInfo, 15000)
                return
            })
        }, () => {
            // appendText('等待15秒后,继续上传...')
            setTimeout(() => {
                // 导出文件
                _exportFile(type, date, endDate, shopInfo, (res) => {
                    // 检查文件是否生成
                    _checkFile(type, date, endDate, shopInfo, res, () => {
                        // 下载文件
                        _downloadFile(type, date, endDate, shopInfo, res, (content) => {
                            // 补全商品图
                            _fillContent(type, date, endDate, shopInfo, res, content, (titleArray, headerArray, newDataArray) => {
                                // 上传服务器
                                _uploadArray(type, date, endDate, shopInfo, titleArray, headerArray, newDataArray, () => {
                                    // 记录上传成功状态
                                    _storeUploadStatus(type, date, endDate, shopInfo, newDataArray.length, () => {
                                        // 继续下一个类型或者继续前一天数据
                                        continueUpload(type, date, endDate, shopInfo, 15000)
                                    })
                                })
                            })
                        })
                    })
                })
            }, timeout)
            if (timeout > 0) {
                let message = `${getTitleTip(type, date, shopInfo)}等待${timeout / 1000}秒后继续下一个...`
                Events.dispatch(Events.INFO_MESSAGE, message)
                console.log(message)
            }
            return
        })
    })
}

// 检查服务器已经上传的数据数量
function _checkServer(type, date, endDate, shopInfo, existCallback, noExistCallback) {
    let ymdArray = getYmdArray(date)
    const formData = new FormData()
    let indexName = type == 0 ? 'overall_index' : 'keyword_index'
    // indexName = indexName + "_" + ymdArray.join('-')
    formData.append('indexName', indexName)
    formData.append('shopId', shopInfo.shopid)
    formData.append('year', ymdArray[0])
    formData.append('month', ymdArray[1])
    formData.append('day', ymdArray[2])
    let url = `${ES_BASE_URL}/ads/index-count`
    fetch(url, {
        method: 'POST',
        body: formData
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                let count = data.data
                if (count && count > 0) {
                    existCallback(count)
                    return
                } else {
                    noExistCallback()
                    return
                }
            } else {
                let message = `请求服务器失败,${url}`
                console.error(message)
                Events.dispatch(Events.ERROR_MESSAGE, message)
            }
        })
        .catch(error => console.error(error))
}

// 检查本地是否上传过
function _checkLocal(type, date, endDate, shopInfo, existCallback, undoCallback) {
    let shopid = shopInfo.shopid.toString()
    let indexName = getIndexName(type, date, shopInfo)
    // 例: 833005508_index_0_2023_3_28
    chrome.storage.local.get([shopid], function (result) {
        // 本地判断是否上传过，如果已经上传过则不再上传
        let shopObj = result[shopid]
        if (shopObj) {
            let indexArray = type == 0 ? shopObj.type0 : shopObj.type1
            if (indexArray.includes(indexName)) {
                existCallback()
                return
            }
        }
        undoCallback()
        return
    })
}

// 标记本地已经上传过状态
function _storeUploadStatus(type, date, endDate, shopInfo, count, callback) {
    let shopid = shopInfo.shopid.toString()
    let indexName = getIndexName(type, date, shopInfo)
    chrome.storage.local.get([shopid], function (result) {
        let shopObj = result[shopid]
        if (!shopObj) {
            shopObj = {
                'type0': new Array(7), 'type1': new Array(7)
            }
        }
        if (type == 0) {
            shopObj.type0 = shopObj.type0 ? shopObj.type0 : new Array(7)
            if (shopObj.type0.includes(indexName)) {
                return
            }
            shopObj.type0.shift()
            shopObj.type0.push(indexName)
        } else {
            shopObj.type1 = shopObj.type1 ? shopObj.type1 : new Array(7)
            if (shopObj.type1.includes(indexName)) {
                return
            }
            shopObj.type1.shift()
            shopObj.type1.push(indexName)
        }
        let storeShops = {}
        storeShops[shopid] = shopObj
        chrome.storage.local.set(storeShops, function () {
            // let typename = getTypename(type)
            // let message = `${getTitleTip(type, date, shopInfo)} 已标记上传成功状态 ${count} 条`
            // Events.dispatch(Events.SUCCESS_MESSAGE, message)
            callback()
            return
        })
    })
}

// 继续上传下一个
function continueUpload(type, date, endDate, shopInfo, timeout) {
    if (type == 0) {
        fetchFile(1, date, endDate, shopInfo, timeout)
    } else {
        let beforeDate = new Date(date.getTime() - 86400000)
        if (startOfDate(beforeDate) < startOfDate(endDate)) {
            let message = `收集完成, 截止日期: ${getYmdArray(date).join('_')}`
            Events.dispatch(Events.SUCCESS_MESSAGE, message)
            console.log(message)
            return
        }
        fetchFile(0, beforeDate, endDate, shopInfo, timeout)
    }
}

// 下载指定类型的昨日数据
function fetchFile(type, date, endDate, shopInfo = null, timeout = 0) {
    if (shopInfo) {
        execution(type, date, endDate, shopInfo, timeout)
    } else {
        _getShopInfo(shopInfo => {
            execution(type, date, endDate, shopInfo, timeout)
        })
    }
}

function removeShopStorage() {
    _getShopInfo((shopInfo) => {
        let _arr = []
        _arr.push(shopInfo.shopid.toString())
        chrome.storage.local.remove(_arr, function () {
            Events.dispatch(Events.INFO_MESSAGE, `商店: ${shopInfo.shopid} 重置上传状态成功`)
            console.log('重置上传状态成功')
        })
    })
}

function getTypename(type) {
    let typename = type == 0 ? '综合数据' : '关键字数据'
    return typename
}

function getIndexName(type, date, shopInfo) {
    let y_m_d = getYmdArray(date).join("_")
    let index_name = `${shopInfo.shopid}_index_${type}_${y_m_d}`
    return index_name
}

function getTitleTip(type, date, shopInfo) {
    let y_m_d = getYmdArray(date).join("_")
    let tip = `[${shopInfo.shopid}/${y_m_d}/${getTypename(type)}]: `
    return tip
}


Events.listener(Events.INFO_MESSAGE, ([message]) => {
    this.sendToFront('info', message)
})

Events.listener(Events.WARN_MESSAGE, ([message]) => {
    this.sendToFront('warn', message)
})

Events.listener(Events.SUCCESS_MESSAGE, ([message]) => {
    this.sendToFront('success', message)
})

Events.listener(Events.ERROR_MESSAGE, ([message]) => {
    this.sendToFront('error', message)
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
    console.log('收到前台消息:', request)
    if (request.type == 'fetch') {
        Events.dispatch(Events.INFO_MESSAGE, '收到用户消息,开始收集...')
        // 下载过去7日内数据
        this.fetchFile(0, today(-1), today(-7))
    }
})


chrome.storage.onChanged.addListener(function (changes, namespace) {
    for (let [key, {oldValue, newValue}] of Object.entries(changes)) {
        console.log(`Storage key "${key}" in namespace "${namespace}" changed.`, `Old value was "${oldValue}", new value is "${newValue}".`);
    }
})