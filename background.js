// v3中文开发文档: https://doc.yilijishu.info/chrome/getstarted.html
import * as common from "./common.js";
import Events from "./events.js";

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

// 监听获取cookie回调
Events.listener(Events.GET_COOKIES, ([action, type, cookies]) => {
    chrome.storage.sync.set({'cookies': cookies}, function () {
    })
})

// 监听文件导出事件回调
Events.listener(Events.EXPORT_FILE, ([type, file_res]) => {
    let typename = type == 0 ? '综合数据' : '关键字数据'
    let message = `开始导出${typename}` + ":" + file_res.fileid + '/' + file_res.filename
    common.sendToFront('success', message)
})

// 监听文件生成检查状态回调
Events.listener(Events.CHECK_FILE, ([type, res, status]) => {
    let typename = type == 0 ? '综合数据' : '关键字数据'
    if (status == 0) {
        // 文件已生成
        common.sendToFront('success', `${typename}: ${res.fileid}/${res.filename} 已经生成`)
    }
})

// 监听导出失败事件
Events.listener(Events.EXPORT_FILE_ERROR, (message) => {
    common.sendToFront('error', `导出失败: ${message}`)
})

// 监听检查失败事件
Events.listener(Events.CHECK_FILE_ERROR, (message) => {
    common.sendToFront('error', `检查失败: ${message}`)
})

// 监听文件下载读取到内容事件
Events.listener(Events.DOWNLOAD_FILE, (content) => {
    // common.sendToFront('info', `文件内容: ${content}`)
})

// 监听分段获取广告列表
Events.listener(Events.OFFSET_MARKETING_DATA, ([offset, limit, datas]) => {
    common.sendToFront('info', `获取广告列表: offset:${offset} limit:${limit} 共${datas.length}条`)
})

// 上传成功回调
Events.listener(Events.UPLOAD_COMPLETE, (type, result) => {
    let y_m_d = [common.yesterday().getFullYear(), common.yesterday().getMonth(), common.yesterday().getDay()].join("_")
    let index_name = `index_${type}_${y_m_d}`
    chrome.storage.sync.set({index_name: true}, function () {
        let typename = type == 0 ? '综合数据' : '关键字数据'
        common.sendToFront('success', `${typename} ${y_m_d}: 已成功上传服务器`)
        // 综合数据上传成功后，继续上传关键字数据
        if (type == 0) {
            common.fetchFile(1, false)
        }
    })
})

// 监听已经上传过的错误消息
Events.listener(Events.UPLOADED_ERROR, ([type, year, month, day]) => {
    let typename = type == 0 ? '综合数据' : '关键字数据'
    common.sendToFront(`昨日${typename}数据已上传过: ${year}-${month}-${day}`)
    // 综合数据已经上传后，继续上传关键字数据
    if (type == 0) {
        common.fetchFile(1, false)
    }
})

function fetchOnLoad() {
    common.fetchFile(0, true)
}

// 页面打开完成后触发事件
chrome.webNavigation.onCompleted.addListener(function (details) {
    if (details.frameId === 0 && details.url.includes(common.SHOPEE_BASE_DOMAIN)) {
        // 发送前端通知
        common.sendToFront("success", "后台广告自动抓取已开始")
        common.sendToNotify('虾皮广告插件已成功加载!')
        setInterval(fetchOnLoad, 5000)
    }
});

// 后台接收前端发送过来的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('收到前台消息:', request.message)
});
