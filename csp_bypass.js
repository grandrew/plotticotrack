chrome.webRequest.onHeadersReceived.addListener(
  function(details) {
    return {
      responseHeaders: details.responseHeaders.filter(
        header => !["content-security-policy", "content-security-policy-report-only"]
          .includes(header.name.toLowerCase())
      )
    };
  },
  {
    urls: ["<all_urls>"],
    types: ["main_frame", "sub_frame"]
  },
  ["blocking", "responseHeaders"]
);
