console.log('====================已经加载虾皮广告收集器====================')

var status0 = false

var status1 = false

function fetch0() {
    console.log('content.js: ', '检测并开始收集综合广告数据...')
    if (!status0) {
        // 通知后台开始收集综合广告数据
        chrome.runtime.sendMessage({type: 'fetch', message: '开始收集综合广告数据', data: 0})
    } else {
        console.log('综合广告数据已上传过,不再重复收集')
    }
}

function fetch1() {
    console.log('content.js: ', '检测并开始收集关键字广告数据...')
    if (!status1) {
        // 通知后台开始收集综合广告数据
        chrome.runtime.sendMessage({type: 'fetch', message: '开始收集关键字广告数据', data: 1})
    } else {
        console.log('关键字数据已上传过,不再重复收集')
    }
}


window.addEventListener('load', (event) => {
    // setInterval(fetch0, 1000 * 20)
    // setInterval(fetch1, 1000 * 40)
});


// 监听后台消息，这里处理后台任务处理后的前端提示
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    console.log('插件消息:', request.message)
    if (request.type == 'completed') {
        if (request.data == 0) {
            status0 = true
        } else {
            status1 = true
        }
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