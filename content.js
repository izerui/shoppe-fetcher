console.log('====================已经加载虾皮广告收集器====================')

window.addEventListener('load', (event) => {
    // setInterval(() => {
    //     console.log('content.js: ', '检测并开始收集广告数据...')
    //     // 通知后台开始收集综合广告数据
    //     chrome.runtime.sendMessage({type: 'fetch', message: '开始收集综合广告数据', data: {type: 0, date: today(-1)}})
    // }, 1000 * 60 * 1)
})


// 监听后台消息，这里处理后台任务处理后的前端提示
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.type == 'error') {
        console.error('插件消息:', request.message)
    } else {
        console.log('插件消息:', request.message)
    }
    console.log('插件消息:', request.message)
    // 消息类型为完成状态
    // if (request.type == 'completed') {
    //     let data = request.data
    //     // 数据类型为综合数据
    //     if (data.type == 0) {
    //         chrome.runtime.sendMessage({
    //             type: 'fetch',
    //             message: '开始收集关键字广告数据',
    //             data: {type: 1, date: data.date}
    //         })
    //     } else {
    //         status1 = true
    //     }
    // }

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


function today(offset) {
    let date = new Date()
    date = new Date(date.getTime() + offset * 86400000)
    return date
}