/**
 * 建议通过事件通知机制做跟业务无关的通知、展示等动作。
 * @type {{CHECK_FILE_ERROR: string, CHECK_FILE: string, EXPORT_FILE: string, dispatch(*, ...[*]): void, listeners: {}, listener(*, *): void, remove(*): void, GET_COOKIES: string, EXPORT_FILE_ERROR: string}}
 */
const Events = {
    /**
     * args: [cookies]
     */
    GET_COOKIES: 'getCookies',
    /**
     * args: [type, fileObj]
     */
    EXPORT_FILE: 'exportFile',
    /**
     * args: [type, fileObj, status]
     */
    CHECK_FILE: 'checkFile',
    /**
     * args: [errMsg]
     */
    EXPORT_FILE_ERROR: 'exportFileError',
    /**
     * args: [errMsg]
     */
    CHECK_FILE_ERROR: 'checkFileError',
    /**
     * args: [textContent]
     */
    DOWNLOAD_FILE: 'downloadFile',
    /**
     * args: [offset, limit, offsetDatas]
     */
    OFFSET_MARKETING_DATA: 'offsetMarketingData',
    /**
     * args: [datas]
     */
    MARKETING_DATA: 'marketingData',
    /**
     * args: [errMsg]
     */
    MARKETING_DATA_ERROR: 'marketingDataError',
    /**
     * args: [titleArray, headerArray, newDataArray, infoDataArray]
     */
    GENERATE_DATA_ARRAY: 'generateDataArray',
    /**
     * args: [type, serverResponseResult]
     */
    UPLOAD_COMPLETE: 'uploadComplete',
    /**
     * args: [type,year,month,day]
     */
    UPLOADED_ERROR: 'uploadedError',
    listeners: {},
    /**
     * 触发事件
     * @param eventName 事件名
     * @param args 传参
     */
    dispatch(eventName, ...args) {
        let events = this.listeners[eventName]
        if (events && events instanceof Array) {
            events.forEach(event => {
                event(args)
            })
        }
    },
    /**
     * 事件监听
     * @param eventName 事件名
     * @param listener 监听方法
     */
    listener(eventName, listener) {
        let events = this.listeners[eventName]
        if (!events) {
            events = []
        }
        events.push(listener)
        this.listeners[eventName] = events
    },
    /**
     * 移除事件监听
     * @param eventName 事件名
     */
    remove(eventName) {
        if (!this.listeners[eventName]) {
            return;
        }
        this.listeners[eventName] = [];
    },
};

export default Events;
