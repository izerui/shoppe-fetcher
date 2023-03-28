$(document).ready(function () {

    // 监听文件导出事件回调,在页面显示
    Events.listener(Events.EXPORT_FILE, ([type, date, shopInfo, file_res]) => {
        let message = `导出${getTypename(type)}` + ":" + file_res.fileid + '/' + file_res.filename
        appendText(message)
    })

    // 监听文件生成检查状态回调
    Events.listener(Events.CHECK_FILE, ([type, date, shopInfo, res, status]) => {
        let status_name = status == 0 ? '文件已生成' : '文件生成中'
        let message = `${getTypename(type)}${status_name}` + ":" + res.fileid + '/' + res.filename
        appendText(message)
    })

    // 监听导出失败事件
    Events.listener(Events.EXPORT_FILE_ERROR, ([type, date, message]) => {
        appendText(`导出${getTypename(type)}失败: ${message}`)
    })

    // 监听检查失败事件
    Events.listener(Events.CHECK_FILE_ERROR, ([type, date, shopInfo, message]) => {
        appendText(`检查失败: ${message}`)
    })

    // 监听文件下载读取到内容事件
    Events.listener(Events.DOWNLOAD_FILE, ([type, date, shopInfo, content]) => {
        // appendText(`读取到内容: ${content}`)
    })

    // 监听分段获取广告列表
    Events.listener(Events.OFFSET_MARKETING_DATA, ([type, date, shopInfo, offset, limit, datas]) => {
        appendText(`获取广告列表: offset:${offset} limit:${limit} 共${datas.length}条`)
    })

    // 监听csv文件补全后的内容事件
    Events.listener(Events.GENERATE_DATA_ARRAY, ([type, date, shopInfo, titleArray, headerArray, newDataArray]) => {
        appendText(`csv文件补全完成，共 ${newDataArray.length} 条`)
        // let newArray = [].concat(titleArray, headerArray, newDataArray)
        // 准备将数据整理成 csv 格式
        // const csvContent = "data:text/csv;charset=utf-8," + newArray.map(e => e.join(",")).join("\n");
        // console.log("生成新的csv内容", csvContent)
        // chrome.downloads.download({
        //     url: URL.createObjectURL(new Blob([csvContent])),
        //     filename: "datas.csv",
        //     saveAs: true
        // }, function (downloadId) {
        //     console.log("Downloaded file with ID: " + downloadId);
        // }, function () {
        //     console.error("Failed to download");
        // })
    })

    Events.listener(Events.UPLOAD_COMPLETE, ([type, date, shopInfo, count]) => {
        let message = `昨日${getTypename(type)} : 已成功上传服务器 ${count} 条`
        if (status == 'exist') {
            message = `昨日${getTypename(type)}数据: 已上传过 ${count} 条`
        }
        appendText(message)
    })

    Events.listener(Events.UPLOAD_EXIST, ([type, date, shopInfo]) => {
        let indexName = getIndexName(type, date, shopInfo)
        appendText(`${indexName}已经上传过, 不再重复上传`)
    })

    function appendText(message) {
        let text = $('#myText').text()
        $('#myText').text(text + message + '\n')
        $('#myText').scrollTop = $('#myText').scrollHeight - $('#myText').offsetHeight
    }

    // 收集昨日综合数据
    $('#btn_0').click((event) => {
        fetchFile(0, new Date(), false)
    })

    // 收集昨日关键字数据
    $('#btn_1').click((event) => {
        fetchFile(1, new Date(), false)
    })

    $('#clear').click((event) => {
        $('#myText').text('')
    })

})
