// 引入mock.js，不使用时注释掉，build前要注释掉
import '@/mock'
/*global chrome*/

// 请求服务器地址（开发环境模拟请求地址）
let API_DOMAIN = '/api/'
// 请求服务器地址（正式build环境真实请求地址）REACT_APP_DEBUG的值来自于11.1章节创建的.env.development文件
if (process.env.REACT_APP_DEBUG !== 'true') {
    API_DOMAIN = 'http://localhost/api/'
}

// API请求正常，数据正常
export const API_CODE = {
    // API请求正常
    OK: 200,
    // API请求正常，数据异常
    ERR_DATA: 403,
    // API请求正常，空数据
    ERR_NO_DATA: 301,
    // API请求正常，登录异常
    ERR_LOGOUT: 401,
}
// API请求异常报错内容
export const API_FAILED = '网络连接异常，请稍后再试'

// API请求汇总
export const apiReqs = {
    // 登录
    signIn: (config) => {
        config.url = API_DOMAIN + 'login/'
        config.method = 'post'
        apiFetch(config)
    },
    // 获取数据
    getData: (config) => {
        config.url = API_DOMAIN + 'getData/'
        config.method = 'get'
        apiFetch(config)
    },
    // 委托background提交数据
    submitByBackground: (config) => {
        config.background = true
        config.url = API_DOMAIN + 'submit/'
        config.method = 'post'
        apiFetch(config)
    },
}

// 发起请求
function apiFetch(config) {
    if (config.background && process.env.REACT_APP_DEBUG !== 'true') {
        // [适用于build环境的content script]委托background script发起请求，此种方式只能传递普通json数据，不能传递函数及file类型数据。
        sendRequestToBackground(config)
    } else {
        // [适用于popup及开发环境的content script]发起请求
        apiRequest(config)
    }
}

/*
 * API request encapsulation (with validation information)
 * config.method: [Required] Request method
 * config.url: [Required] Request URL
 * config.data: Request data
 * config.formData: Whether to submit as formData format (used for file uploads)
 * config.success(res): Callback for successful request
 * config.fail(err): Callback for failed request
 * config.done(): Callback when the request is complete
 */
export function apiRequest(config) {
    // If config.data is not set, default to {}
    if (config.data === undefined) {
        config.data = {}
    }

    // If config.method is not set, default to 'post'
    config.method = config.method || 'post'

    // Set up request headers
    let headers = {}
    let data = null

    if (config.formData) {
        // Compatibility handling for file uploads. If config.formData=true, the request is made using form-data.
        // fetch() will automatically set Content-Type to multipart/form-data, no additional setting needed.
        data = new FormData()
        Object.keys(config.data).forEach(function (key) {
            data.append(key, config.data[key])
        })
    } else {
        // If not uploading files, fetch() defaults Content-Type to text/plain;charset=UTF-8, so it needs to be manually modified.
        headers['Content-Type'] = 'application/json;charset=UTF-8'
        data = JSON.stringify(config.data)
    }

    // Prepare all the request data
    let axiosConfig = {
        method: config.method,
        headers,
        body: data,
    }

    // Send the request
    fetch(config.url, axiosConfig)
        .then((res) => res.json())
        .then((result) => {
            // Callback when the request is complete
            config.done && config.done()
            // Callback for a successful request
            config.success && config.success(result)
        })
        .catch(() => {
            // Callback when the request is complete
            config.done && config.done()
            // Callback for a failed request
            config.fail && config.fail(API_FAILED)
        })
}

// Send a request to background
function sendRequestToBackground(config) {
    // In chrome.runtime.sendMessage, only JSON data can be transmitted, file types cannot be sent,
    // so the request is sent directly from the popup.
    // The message to send. This message should be a JSON-ifiable object.
    // For more details, refer to: https://developer.chrome.com/extensions/runtime#method-sendMessage
    if (chrome && chrome.runtime) {
        chrome.runtime.sendMessage(
            {
                // Include an identifier so that the background script knows this message is for an API request
                contentRequest: 'apiRequest',
                config: config,
            },
            (result) => {
                // Receive the result data returned by the background script's sendResponse method
                config.done && config.done()
                if (result.result === 'succ') {
                    config.success && config.success(result)
                } else {
                    config.fail && config.fail(result.msg)
                }
            }
        )
    } else {
        console.log('Chrome API not found')
    }
}
