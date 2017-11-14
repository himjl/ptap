
function isAuthenticated(){
    return !!getAccessTokenFromUrl()
}

//parse access token from url if in urls hash
function getAccessTokenFromUrl(){
    return utils.parseQueryString(window.location.hash).access_token
}



var DBX_REDIRECT_URI = DBX_REDIRECT_URI_ROOT + "liveplot.html"
//return whether user was redirected here after authenticating
function isAuthenticated(){
    return !!getAccessTokenFromUrl()
}
//parse access token from url if in urls hash
function getAccessTokenFromUrl(){
    return utils.parseQueryString(window.location.hash).access_token
}


var datajson


