import * as common from "./common.js";
import Events from "./events.js";
import {yesterday} from "./common.js";

$(document).ready(function () {

    // 监听文件导出事件回调,在页面显示
    Events.listener(Events.EXPORT_FILE, ([type, file_res]) => {
        let typename = type == 0 ? '综合数据' : '关键字数据'
        let message = `开始导出${typename}` + ":" + file_res.fileid + '/' + file_res.filename
        appendText(message)
    })

    // 监听文件生成检查状态回调
    Events.listener(Events.CHECK_FILE, ([type, res, status]) => {
        let typename = type == 0 ? '综合数据' : '关键字数据'
        let status_name = status == 0 ? '文件已生成' : '文件生成中'
        let message = `${typename}${status_name}` + ":" + res.fileid + '/' + res.filename
        appendText(message)
    })

    // 监听导出失败事件
    Events.listener(Events.EXPORT_FILE_ERROR, ([message]) => {
        appendText(`导出失败: ${message}`)
    })

    // 监听检查失败事件
    Events.listener(Events.CHECK_FILE_ERROR, ([message]) => {
        appendText(`检查失败: ${message}`)
    })

    // 监听文件下载读取到内容事件
    Events.listener(Events.DOWNLOAD_FILE, ([content]) => {
        // appendText(`读取到内容: ${content}`)
    })

    // 监听分段获取广告列表
    Events.listener(Events.OFFSET_MARKETING_DATA, ([offset, limit, datas]) => {
        appendText(`获取广告列表: offset:${offset} limit:${limit} 共${datas.length}条`)
    })

    // 监听已经上传过的错误消息
    Events.listener(Events.UPLOADED_ERROR, ([type, year, month, day]) => {
        let typename = type == 0 ? '综合数据' : '关键字数据'
        appendText(`昨日${typename}数据已上传过: ${year}-${month}-${day}`)
    })

    // 监听csv文件补全后的内容事件
    Events.listener(Events.GENERATE_DATA_ARRAY, ([titleArray, headerArray, newDataArray]) => {
        let newArray = [].concat(titleArray, headerArray, newDataArray)
        // 准备将数据整理成 csv 格式
        const csvContent = "data:text/csv;charset=utf-8," + newArray.map(e => e.join(",")).join("\n");
        console.log("生成新的csv内容", csvContent)
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

    Events.listener(Events.UPLOAD_COMPLETE, (type, result) => {
        let typename = type == 0 ? '综合数据' : '关键字数据'
        appendText(`${typename}: 已成功上传服务器`)
    })

    function appendText(message) {
        let text = $('#myText').text()
        $('#myText').text(text + message + '\n')
        $('#myText').scrollTop = $('#myText').scrollHeight - $('#myText').offsetHeight
    }

    // 收集昨日综合数据
    $('#btn_0').click((event) => {
        common.fetchFile(0, true)
    })

    // 收集昨日关键字数据
    $('#btn_1').click((event) => {
        common.fetchFile(1, true)
    })

    $('#clear').click((event) => {
        $('#myText').text('')
    })


})
