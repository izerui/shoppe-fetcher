$(document).ready(function () {

    Events.listener(Events.SUCCESS_MESSAGE, ([message]) => {
        appendText(`[success] ${message}`)
    })

    Events.listener(Events.INFO_MESSAGE, ([message]) => {
        appendText(`[info] ${message}`)
    })

    Events.listener(Events.WARN_MESSAGE, ([message]) => {
        appendText(`[warn] ${message}`)
    })

    Events.listener(Events.ERROR_MESSAGE, ([message]) => {
        appendText(`[error] ${message}`)
    })

    function appendText(message) {
        let text = $('#myText').text()
        $('#myText').text(text + message + '\n')
        $('#myText').scrollTop = $('#myText').scrollHeight - $('#myText').offsetHeight
    }

    // 收集综合数据
    $('#btn_0').click((event) => {
        fetchFile(0, today(-1), today(-7))
    })

    // 收集关键字数据
    $('#reset').click((event) => {
        removeShopStorage()
    })

    $('#clear').click((event) => {
        $('#myText').text('')
    })

})
