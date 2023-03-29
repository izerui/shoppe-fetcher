console.log('====================已经加载虾皮广告收集器====================')

// setInterval(() => {
//     console.log(today(-1))
// }, 5000)

setTimeout(() => {
    console.log('content.js: ', '检测并开始收集广告数据...')
    // 通知后台开始收集综合广告数据
    chrome.runtime.sendMessage({
        type: 'fetch', message: '开始收集综合广告数据'
    })
    console.log('content.js: ', '已经发送给后台消息...')
}, 1000 * 10)


// 监听后台消息，这里处理后台任务处理后的前端提示
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.type == 'success') {
        console.log('插件消息: ', request)
        $.toast({
            heading: 'Success', text: request.message, showHideTransition: 'slide', icon: 'success'
        })
    } else if (request.type == 'warn') {
        console.warn('插件消息: ', request)
        $.toast({
            heading: 'Warning', text: request.message, showHideTransition: 'plain', icon: 'warning'
        })
    } else if (request.type == 'error') {
        console.error('插件消息: ', request)
        $.toast({
            heading: 'Error', text: request.message, showHideTransition: 'fade', icon: 'error'
        })
    } else {
        console.log('插件消息: ', request)
        $.toast({
            heading: 'Information', text: request.message, showHideTransition: 'slide', icon: 'info'
        })
    }
});