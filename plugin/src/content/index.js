/* global chrome */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
// global style sheet
import '../common/styles/index.less';

let shadowRoot = null;

let somLoaded

function injectScript(filePath) {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL(filePath);
    document.head.appendChild(script);

    script.onload = function() {
        this.remove();  // Clean up after script is executed
    };
}

window.addEventListener('load', function() {
    console.log('All resources have loaded!');
    const style = document.createElement('style');
    style.textContent = `
        .doaction-mouse-pointer {
            position: relative;
        }
        .doaction-mouse-pointer::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 24px;
            height: 24px;
            background-image: url('data:image/svg+xml,%3Csvg t="1719313130522" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="4232" width="200" height="200"%3E%3Cpath d="M673.408 998.4a25.6 25.6 0 0 1-22.144-12.736l-188.16-324.352-144.192 142.016a25.664 25.664 0 0 1-43.392-15.296L189.44 54.208a25.728 25.728 0 0 1 40.64-23.616l594.368 438.976a25.6 25.6 0 0 1-8.256 45.248l-194.816 54.656 188.16 324.352c3.392 5.888 4.352 12.864 2.624 19.456s-6.016 12.16-11.904 15.552l-113.92 66.048a25.6 25.6 0 0 1-12.864 3.456z m-204.8-404.096a25.28 25.28 0 0 1 22.08 12.8l191.872 330.752 69.632-40.384-191.872-330.816a25.728 25.728 0 0 1 15.168-37.504l176.256-49.472L247.04 106.88l73.088 623.232L450.56 601.6a25.472 25.472 0 0 1 17.92-7.296z" p-id="4233"%3E%3C/path%3E%3C/svg%3E');
            background-size: contain;
            background-repeat: no-repeat;
            transform: translate(-50%, -50%);
            z-index: 999;
        }
    `;
    document.head.appendChild(style);
    injectScript('static/js/som.js');
    // execute another action
}, true);

function hasAncestorWithClassName(element, className) {
    if (element === document.documentElement) {
        return false;
    }

    if (element.parentElement && element.parentElement.classList.contains(className)) {
        return element.parentElement;
    }

    return hasAncestorWithClassName(element.parentElement, className);
}

window.addEventListener('resize', () => {
    const getWindow = () => {
        let x = window.screenX;
        let y = window.screenY;
        let w = window.innerWidth;
        let h = window.innerHeight;

        return [x, y, w, h];
    }
    console.log("[screenX, screenY, innerWidth, innnerHeight]:", getWindow());
});

document.addEventListener('click', function(event) {
    // Check if the first element clicked is a link
    let link = event.target.closest('a');

    console.log('Click event object triggered:', event);
    console.log('Click target event object triggered:', event.target);

    const invalidLinkPatterns = [
        /^#/, // Starts with '#'
        /^javascript:;/,
        /^javascript:void\(0\);?$/,
        /^javascript: void\(0\);?$/,
        /#$/ // Ends with '#'
    ];

    const isInvalidLink = (href) => {
        return invalidLinkPatterns.some(pattern => pattern.test(href));
    };

    // if link.href is current root path
    if (link && link.href && (link.href === '/' || link.href === window.location.origin + '/')) {
        return; // do nothing
    }

    if (link && link.href && !isInvalidLink(link.href)) {
        if (link.hasAttribute('target') && (link.target === '_blank' || link.target === '_black')) {
            // Prevent default behavior (open link)
            event.preventDefault();
            event.stopPropagation();

            // Set the link's target to the current tab
            link.target = '_self';
            console.log("window.location: ", window.location);

            window.location.href = link.href;
        } else if (!link.hasAttribute('target') && (!link.hasAttribute('tabindex') || !link.hasAttribute('aria-controls'))) {
            console.log("link.href: ", link.href);
            event.preventDefault();
            event.stopPropagation();

            // Set the link's target to the current tab
            link.target = '_self';
            console.log("window.location: ", window.location);

            window.location.href = link.href;
        }
    }
    let operationElement = hasAncestorWithClassName(event.target, 'Popover-content');
    if (operationElement) {
        operationElement.remove();
    }

    // handle link with attribute "tabindex" and "aria-controls"
    // if (link && link.hasAttribute('tabindex') && link.hasAttribute('aria-controls')) {
    //     console.log('Tabindex and aria-controls link clicked:', link.href);
    //     event.preventDefault();
    //     event.stopPropagation();

    //     // You can add custom actions here
    //     window.location.href = link.href;
    // }
}, true);

// chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//     if (request.action === 'displaySoM') {
//         window.postMessage({ type: 'RUN_SOM_BEFORE_CAPTURE' }, '*');
//     } else if (request.action === 'runSOMAfterCapture') {
//         window.postMessage({ type: 'RUN_SOM_AFTER_CAPTURE' }, '*');
//     }
//     return true;
// });
//
// // Listen for messages from the page
// window.addEventListener('message', (event) => {
//     if (event.source !== window) return;
//
//     if (event.data.type === 'SOM_DISPLAY_DONE') {
//         console.log('SOM script executed before capture successfully');
//     } else if (event.data.type === 'SOM_AFTER_CAPTURE_DONE') {
//         console.log('SOM script executed after capture successfully');
//     }
// });

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    let expectedResponseType;

    function handlePageMessage(event) {
        if (event.source !== window) return;  

        if (event.data.type === expectedResponseType) {
            console.log(`${event.data.type} executed`);
            sendResponse({ status: 'success', message: `${event.data.type} executed` });
            window.removeEventListener('message', handlePageMessage)
        } else {
            console.log(`[content] Unexpected response type: ${event.data.type}`);
            // sendResponse({ status: 'error', message: `Unexpected response type: ${event.data.type}` });
        }
    }

    window.addEventListener('message', handlePageMessage);

    switch (request.action) {
        case 'displaySoM':
            expectedResponseType = 'SOM_DISPLAY_DONE';
            window.postMessage({ type: 'SOM_DISPLAY' }, '*');
            break;
        case 'hideSoM':
            expectedResponseType = 'SOM_HIDE_DONE';
            window.postMessage({ type: 'SOM_HIDE' }, '*');
            break;
        case 'getMarks':
            const marks = [];
            document.querySelectorAll('[data-som]').forEach((e) => {
                const attributes = Array.from(e.attributes)
                    .map((attr) => (['data-som'].includes(attr.name) ? '' : `${attr.name}="${attr.value}"`))
                    .join(' ');
                const innerText = e.textContent?.trim();
                const element =
                    `<${e.tagName.toLowerCase()} ${attributes}>` + innerText + `</${e.tagName.toLowerCase()}>`;
                marks.push({ label: e.getAttribute('data-som'), element });
            });
            sendResponse({ status: 'success', marks });
            break;
        // default:
        //     sendResponse({ status: 'error', message: 'Invalid action' });
        //     break;
    }

    return true
});
