console.log('====================已经加载虾皮广告收集器====================')

var loading = false

function intervalFetch() {
    if (!loading) {
        loading = true
        chrome.runtime.sendMessage({type: 'fetch', message: '开始收集广告数据'})
        console.log('content.js: ', '检测并开始收集广告数据...')
    }
}

setInterval(intervalFetch, 10000)

// 监听后台消息，这里处理后台任务处理后的前端提示
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    console.log('插件消息:', request.message)
    if (request.type == 'completed') {
        loading = false
        return
    }
    chrome.storage.sync.get('showMsg', function (result) {
        if (result.showMsg && Number(result.showMsg) == 1) {
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
        }
    })
});