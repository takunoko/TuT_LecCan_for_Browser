
// adMob広告を貼り付けるためのプラグイン
// モバイル端末のみで動作
// https://github.com/floatinghotpot/cordova-admob-pro

$("#cancel_list").on("pagecreate",function(event){ //can use pagebeforecreate as well

    function adSetter(){
        var admobid = {};
        // select the right Ad Id according to platform
        if( /(android)/i.test(navigator.userAgent) ) {
            admobid = { // for Android
                banner: 'ca-app-pub-7793625773402990/1179788067',
                interstitial: 'ca-app-pub-7793625773402990~7505523262'
            };
        } else if(/(ipod|iphone|ipad)/i.test(navigator.userAgent)) {
            admobid = { // for iOS
                banner: '',
                interstitial: ''
            };
        } else {
            admobid = { // for Windows Phone
                banner: '',
                interstitial: ''
            };
        }

        if(AdMob) AdMob.createBanner( {
            adId:admobid.banner,
            position:AdMob.AD_POSITION.BOTTOM_CENTER,
            autoShow:true} );

    }

    function onDeviceReady(){
        adSetter();
    }

    document.addEventListener("deviceready", onDeviceReady, false);

});
