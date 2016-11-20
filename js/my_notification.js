
// プラグイン cordova-plugin-local-notificationsを参照。
// https://github.com/katzer/cordova-plugin-local-notifications/wiki/04.-Scheduling

// なんか基本として必要そうなの
var dialog;

callback = function () {
    cordova.plugins.notification.local.getIds(function (ids) {
        showToast('IDs: ' + ids.join(' ,'));
    });
};

showToast = function (text) {
    setTimeout(function () {
        if (device.platform != 'windows') {
            window.plugins.toast.showShortBottom(text);
        } else {
            showDialog(text);
        }
    }, 100);
};

showDialog = function (text) {
    if (dialog) {
        dialog.content = text;
        return;
    }

    dialog = new Windows.UI.Popups.MessageDialog(text);

    dialog.showAsync().done(function () {
        dialog = null;
    });
};

// <!-- callbacks -->
// scheduleとか呼ばれたら実行してほしい関数を定義する?
// 毎回実行してくれるのかな?
// 定義した時に呼び出されるやつ?
document.addEventListener('deviceready', function () {
    cordova.plugins.notification.local.on('schedule', function (notification) {
        console.log('onschedule', arguments);
        // showToast('scheduled: ' + notification.id);
    });

    cordova.plugins.notification.local.on('update', function (notification) {
        console.log('onupdate', arguments);
        // showToast('updated: ' + notification.id);
    });

    // 通知が実行される際に毎度呼ばれるみたい
    cordova.plugins.notification.local.on('trigger', function (notification) {
        console.log('ontrigger', arguments);
        // showToast('triggered: ' + notification.id);
    });

    cordova.plugins.notification.local.on('click', function (notification) {
        console.log('onclick', arguments);
        // showToast('clicked: ' + notification.id);
    });

    cordova.plugins.notification.local.on('cancel', function (notification) {
        console.log('oncancel', arguments);
        // showToast('canceled: ' + notification.id);
    });

    cordova.plugins.notification.local.on('clear', function (notification) {
        console.log('onclear', arguments);
        // showToast('cleared: ' + notification.id);
    });

    cordova.plugins.notification.local.on('cancelall', function () {
        console.log('oncancelall', arguments);
        // showToast('canceled all');
    });

    cordova.plugins.notification.local.on('clearall', function () {
        console.log('onclearall', arguments);
        // showToast('cleared all');
    });
}, false);

function set_notification(my_info, notifi_remind, notifi_yesterday, notifi_today, notifi_yesterday_time, notifi_today_time){
    cordova.plugins.notification.local.cancelAll(function(){
        // 値が無ければ各設定されている値を取得する
        if(notifi_remind == null){
            notifi_remind = str2bool(localStorage.getItem('notifi_remind'));
        }
        if(notifi_yesterday == null){
            notifi_yesterday = str2bool(localStorage.getItem('notifi_yesterday'));
        }
        if(notifi_today == null){
            notifi_today = str2bool(localStorage.getItem('notifi_today'));
        }
        if(notifi_yesterday_time == null){
            // localStorageにも無い可能性がある?
            if(!(notifi_yesterday_time = localStorage.getItem('notifi_yesterday_time'))){
                // localStorageに保存されてなかったら
                notifi_yesterday_time = '21:00';
            }
        }
        if(notifi_today_time == null){
            if(!(notifi_today_time = localStorage.getItem('notifi_today_time'))){
                notifi_today_time = '08:00';
            }
        }

        // 再表示通知
        if(notifi_remind){
            set_notifi_remind();
        }

        // 前日21:00
        if(notifi_yesterday){
            var split_time = notifi_yesterday_time.split(':');
            set_notification_time(my_info, 1, "明日", -1, Number(split_time[0]), Number(split_time[1]));   // idは1から開始
        }
        // 当日8:00
        if(notifi_today){
            var split_time = notifi_today_time.split(':');
            set_notification_time(my_info, my_info.rows.length + 1, "今日", 0, Number(split_time[0]), Number(split_time[1])); // idはlength+1から開始
        }
    }); // 通知を再設定する際に、一度すべての通知を削除する
}

// 1週間おきに「アプリが起動されてないよ」って通知を行う。
function set_notifi_remind(flg){
    if(flg == null){
        flg = str2bool(localStorage.getItem('notifi_remind'));
    }
    var notifi_data = {};  // 1要素(通知単位)

    // 通知パラメータ設定
    var notifi_time = new Date();
    // var notifi_time = new Date(tmp_d.getFullYear(), tmp_d.getMonth(), tmp_d.getDate() + 7, tmp_d.getHours(), tmp_d.getMinutes(), 0);
    notifi_time.setDate(notifi_time.getDate() + 7);
    // デバッグ用コード
    // notifi_time.setSeconds(notifi_time.getSeconds() + 10);

    notifi_data['id'] = 0;
    notifi_data['title'] = '最近アプリを利用していません';
    notifi_data['text'] = '新しい情報が追加されているかも...。';
    notifi_data['at'] = notifi_time;   // 前日夜21:00を想定
    notifi_data['every'] = 'week';
    notifi_data['icon'] = "res://icon.png";
    notifi_data['smallIcon'] = "res://icon_touka.png";
    notifi_data['sound'] = null;
    // ARGBと書かれてるけど、プラグイン内でAはFFにされてるらしい。
    // 点滅の間隔はいじれないっぽい。　ので消す。
    notifi_data['led'] = '000000';

    // プロジェクトルート/platforms/android/res/drawable/ここ に画像ファイルを配置するといい感じに使ってもらえる。
    cordova.plugins.notification.local.cancel(0, function (){ // 起動通知を一度削除する。0は削除するID
        // flgがtrueなら通知を追加する
        if(flg){
            cordova.plugins.notification.local.schedule(notifi_data);
        }
    });
}

// data, 通知させるデータ郡
// start_id 通知番号。　適当に変えないと上書きされるだけ。
// day, -1を指定で前日通知。みたいな
// (正の値[未来]を指定すると授業終了後に通知されるかな？　それまでに起動したらリセットされる
// hour, 通知時刻。24時間表記で
function set_notification_time(my_info, start_id, custom_txt, day, hour, min){
    var notifi_data = [];   // 通知データを保存

    var notifi_d;           // 現在みている日付
    var day_data = [];      // 通知を行う1日分のデータ

    var now_d = new Date(); // 現在の日付

    // データの登録
    // なんか綺麗に書いたけど結局通知はバラバラにされるみたいだから変わらないかな。。。
    for(var i=0; i < my_info.rows.length; i++){
        if (notifi_d != Number(my_info.rows.item(i).day) && i != 0){   // 見ている日付が変わったら
            notifi_data.push(day_data);
            day_data = [];
        }

        var row_data = {};  // 1要素(通知単位)
        notifi_d = new Date(Number(my_info.rows.item(i).day));   // 通知日
        // 通知パラメータ設定
        row_data['id'] = i + start_id;
        row_data['title'] = custom_txt + " " + get_notifi_day_str(notifi_d) + my_info.rows.item(i).state + "講";
        row_data['text'] = my_info.rows.item(i).time + "限 " + my_info.rows.item(i).subject;

        // 本番用
        notifi_d.setDate(notifi_d.getDate() + day);
        notifi_d.setHours(hour);
        notifi_d.setMinutes(min);

        // デバッグ用、いますぐ通知
        // var _d = new Date();
        // var notifi_d = new Date(_d.getFullYear(), _d.getMonth(), _d.getDate(), _d.getHours(), _d.getMinutes(), _d.getSeconds() + (i + start_id)*10);
        row_data['at'] = notifi_d;

        if(my_info.rows.item(i).state === "休"){
            row_data['icon'] = "res://icon_cancel.png";
        }else{
            row_data['icon'] = "res://icon_lecture.png";
        }
        // row_data['icon'] = "res://icon.png";
        row_data['smallIcon'] = "res://icon_touka.png";
        row_data['sound'] = null;

        if(notifi_d > now_d){
            // 現在時刻の方が進んでいたら通知を登録しない。
            // 通知番号が途中で飛ぶ気がするけど大丈夫っしょ。
            day_data.push(row_data);
        }
    }
    notifi_data.push(day_data);

    // 通知の登録
    for(var i=0; i < notifi_data.length; i++){
        cordova.plugins.notification.local.schedule(notifi_data[i]);
    }
}

// Dateを日付(文字列)に直す
// mm/dd(w)
function get_notifi_day_str(date){
    var y = date.getFullYear();
    var m = date.getMonth()+1;  // 得られる月が0-11なため
    var d = date.getDate();
    var w = date.getDay();
    var week = ["日","月","火","水","木","金","土"];

    // 本日の情報
    var ty = today.getFullYear();
    var tm = today.getMonth()+1;
    var td = today.getDate();

    ds = d<10 ? "0" + String(d) : ds = String(d);
    ms = m<9 ? "0" + String(m) : String(m);
    ws = week[w];

    // str = ys + "/" + ms + "/" + ds + "(" + ws + ")";
    str = ms+ "/" +ds+ "(" +ws+ ") ";

    return str;
}

function str2bool(str){
    return (str === 'true') ? true:false;
}
