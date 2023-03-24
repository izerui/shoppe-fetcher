console.log('====================已经加载虾皮广告收集器 22====================')

function intervalFetch() {
    console.log('content.js: ', '检测并开始收集广告数据...')
    chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {type: 'loaded', message: '前端页面已经加载content.js'});
    });
}

setInterval(intervalFetch, 5000)

// 监听后台消息，这里处理后台任务处理后的前端提示
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    console.log('插件消息:', request.message)
    if (request.type == 'success') {
        $.toast({
            heading: 'Success',
            text: request.message,
            showHideTransition: 'slide',
            icon: 'success'
        })
    } else if (request.type == 'info') {
        $.toast({
            heading: 'Information',
            text: request.message,
            showHideTransition: 'slide',
            icon: 'info'
        })
    } else if (request.type == 'warning') {
        $.toast({
            heading: 'Warning',
            text: request.message,
            showHideTransition: 'plain',
            icon: 'warning'
        })
    } else if (request.type == 'error') {
        $.toast({
            heading: 'Error',
            text: request.message,
            showHideTransition: 'fade',
            icon: 'error'
        })
    }

});