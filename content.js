console.log('====================已经加载虾皮广告收集器====================')

var loading = false

function intervalFetch() {
    if (!loading) {
        loading = true
        // 通知后台开始收集综合广告数据
        try {
            chrome.runtime.sendMessage({type: 'fetch', message: '开始收集综合广告数据', data: 0})
        } catch (e) {
            ;
        }
        console.log('content.js: ', '检测并开始收集广告数据...')
    }
}

setInterval(intervalFetch, 6000) // 每10分钟自动收集

// function beginFetch() {
//     setInterval(intervalFetch, 6000) // 每10分钟自动收集
// }
//
// window.addEventListener('load', (event) => {
//     // 首次10秒后开始执行定时器，
//     setTimeout(beginFetch, 5000)
// });


// 监听后台消息，这里处理后台任务处理后的前端提示
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    console.log('插件消息:', request.message)
    if (request.type == 'completed') {
        if (request.data == 0) {
            console.log('content: 5秒后继续收集关键字数据')
            // 继续收集关键字广告数据
            setTimeout(() => {
                chrome.runtime.sendMessage({type: 'fetch', message: '开始收集关键字广告数据', data: 1})
            }, 5000)
        }
        loading = false
    }
    if (request.type == 'success') {
        $.toast({
            heading: 'Success',
            text: request.message,
            showHideTransition: 'slide',
            icon: 'success'
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
    } else {
        $.toast({
            heading: 'Information',
            text: request.message,
            showHideTransition: 'slide',
            icon: 'info'
        })
    }
});