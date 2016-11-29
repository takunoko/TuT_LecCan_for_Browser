// This is a JavaScript file

// 定数
// var lec_can_page_url="http://localhost/tut_lec_can/test2.html"; // PC内テスト環境
// var lec_can_page_url="http://ie.takunoko.com/test4.html";   // ここの違いでちょっとdomの取得が異なる。 本番環境と同じ
var lec_can_page_url="http://ie.takunoko.com/www/LecCan_list.html";   // ここの違いでちょっとdomの取得が異なる。 本番環境と同じ
// var lec_can_page_url="https://www.ead.tut.ac.jp/board/main.aspx"; // 本番環境

// データベース関連
var db_name = "info_db";
var info_table_name = "info_table";
var hidden_table_name = "hidden_list"
var db;

// 変数として保存
var today;

// 現在、自分が利用する情報の一覧
// データベースからの戻り値そのままの形式
// データベースから読み込まれ次第値が入る
var my_info = null;

// 読み込み時に実行
$(function(){
    update_info();
    // データベースに最初に接続?し、以後接続しっぱなし。
    // 最後のデータベースサイズはバイト単位。1科目20バイト(10文字)を想定して500科目名を登録可
    db = window.openDatabase(db_name, "1.0", db_name, 10000);

    // 日付情報の更新
    today = new Date();
    create_DB(db);

    // オーバーレイ要素の設定
    $("#update_button").click(function(){
        update_info();
        $.mobile.loading( "show", {
            text: "Loading...",
            textVisible: true,
        });
    });

    // cordova.plugins.notification.local.clear(0, function (){ }); // 起動したら起動してない通知を消す.
});


// notifi_settingsページが呼ばれた際に実行
$(document).on('pagecreate', '#notifi_settings', function(){
    var notifi_remind, notifi_today, notifi_yesterday, notifi_today_time, notifi_yesterday_time;

    // 初期値の設定
    $('#notifi_remind_button').prop('checked', str2bool(notifi_remind = localStorage.getItem('notifi_remind'))).checkboxradio().checkboxradio("refresh");
    $('#notifi_yesterday_button').prop('checked', str2bool(notifi_yesterday = localStorage.getItem('notifi_yesterday'))).checkboxradio().checkboxradio("refresh");
    $('#notifi_today_button').prop('checked', str2bool(notifi_today = localStorage.getItem('notifi_today'))).checkboxradio().checkboxradio("refresh");

    // 時間があれば設定。なければ21:00と8:00
    if((notifi_yesterday_time = localStorage.getItem('notifi_yesterday_time')) != null){
        $('#notifi_yesterday_time').val(notifi_yesterday_time);
    }else{
        $('#notifi_yesterday_time').val("21:00");
    }
    if((notifi_today_time = localStorage.getItem('notifi_today_time')) != null){
        $('#notifi_today_time').val(notifi_today_time);
    }else{
        $('#notifi_today_time').val("08:00");   // 08:00にしないとデフォでセットしてくれない。
    }
    // 保存ボタンの処理
    $('#notifi_save_button').on('click', function(){
        // 現在の値の保存
        notifi_remind = $('#notifi_remind_button').is(':checked');
        notifi_yesterday = $('#notifi_yesterday_button').is(':checked');
        notifi_today = $('#notifi_today_button').is(':checked');
        notifi_today_time = $('#notifi_today_time').val();
        notifi_yesterday_time = $('#notifi_yesterday_time').val();

        localStorage.setItem('notifi_remind', notifi_remind);
        localStorage.setItem('notifi_yesterday', notifi_yesterday);
        localStorage.setItem('notifi_today', notifi_today);

        localStorage.setItem('notifi_today_time', notifi_today_time);
        localStorage.setItem('notifi_yesterday_time', notifi_yesterday_time);

        // 登録するデータ, 起動通知, 前日通知, 当日通知, 前日通知時間, 当日通知時間
        set_notification(my_info, notifi_remind, notifi_yesterday, notifi_today, notifi_yesterday_time, notifi_today_time);

        var alert_msg = "";
        if(notifi_remind){
            alert_msg += "起動通知: ◯\n";
        }else{
            alert_msg += "起動通知: ×\n";
        }
        if(notifi_yesterday){
            alert_msg += "前日通知: ◯ ";
            alert_msg += "[" + notifi_yesterday_time + "]\n";
        }else{
            alert_msg += "当日通知: ×\n";
        }
        if(notifi_today){
            alert_msg += "当日通知: ◯ ";
            alert_msg += "[" + notifi_today_time + "]\n";
        }else{
            alert_msg += "当日通知: ×\n";
        }

        // alert("通知設定を保存しました。");
        showAlert(alert_msg, "通知設定を保存しました");
    })
});


$(document).on('pagecreate', '#settings', function(){
    update_setting_display();
});

function get_notifi_status(){
    var remind, yesterday, today;

    // localStorageとの親和性を考えて文字列で返す
    if($('#notifi_remind_button').is(':checked')){
        remind = true;
    }else{
        remind = false;
    }
    if($('#notifi_yesterday_button').is(':checked')){
        yesterday = true;
    }else{
        yesterday = false;
    }
    if($('#notifi_today_button').is(':checked')){
        today = true;
    }else{
        today = false;
    }

    // 順番注意
    return [remind, yesterday, today];
}

// ロードエラーの表示設定
function show_load_error(){
    $.mobile.loading( "show", {
        html: '<div id="update_msg">データ更新 失敗</div>',
        textVisible: true,
    });

    // 2秒間表示
    setTimeout(function() {
        $.mobile.loading("hide");
    },2000);
}

// サーバから情報を取得してデータベースの内容を更新する
function update_info(){
    /* 通常のXMLHttpRequestではクロスドメインのカベを超えられない。
    var xhr = new XMLHttpRequest();
    xhr.open('GET', lec_can_page_url, true); // サーバーから非同期でデータを取得
    xhr.responseType = 'document';  // レスポンス型をDocument(DOM形式)にする
    xhr.timeout = 10000;            // 10秒経ってもデータが取得できなかったら失敗とする。 (うまく行ってない気がする。未対応?)
    xhr.onload = function(e){       // コールバック関数的な...?
        dom_data = xhr.responseXML;
        var tb_c_r = dom_data.getElementById('grvCancel').rows;
        var tb_s_r = dom_data.getElementById('grvSupplement').rows;

        set_database(tb_c_r, tb_s_r);
        disp_info();

        setTimeout(function() {
            today = new Date();
            var full_date_str = get_full_date(today);
            $.mobile.loading( "show", {
                html: '<div id="update_msg">データを更新しました<br />' + full_date_str + '</div>',
                textVisible: true
                    // textonly: true
            });

            // 最終更新時刻を更新
            localStorage.setItem('last_update_time', full_date_str);
            $("#update_time").text("Update: " + get_update_time());
            // 2秒間表示
            setTimeout(function() {
                $.mobile.loading("hide");
            },2000);
        },500); // 読み込みに最低でも0.5秒与える。読み込んでるっぽく見せる。
    }
    */

    // クロスドメインのカベを超えるやり方。
    // YahooのサービスYQLを利用している。
    $.ajax({
        url: lec_can_page_url,
        type: 'GET',
        timeout: 10000, // タイムアウト10秒
        dataType: 'html',
        cache: false, // キャッシュOFF

        // データのロード完了時の処理
        success: function(res) {
            var dom_parser = new DOMParser();
            var dom_data = dom_parser.parseFromString(res["responseText"], "text/html");
            var tb_c_r = dom_data.getElementById('grvCancel').rows;
            var tb_s_r = dom_data.getElementById('grvSupplement').rows;

            set_database(tb_c_r, tb_s_r);
            disp_info();

            setTimeout(function() {
                today = new Date();
                var full_date_str = get_full_date(today);
                $.mobile.loading( "show", {
                    html: '<div id="update_msg">データを更新しました<br />' + full_date_str + '</div>',
                    textVisible: true
                        // textonly: true
                });

                // 最終更新時刻を更新
                localStorage.setItem('last_update_time', full_date_str);
                $("#update_time").text("Update: " + get_update_time());
                // 2秒間表示
                setTimeout(function() {
                    $.mobile.loading("hide");
                },2000);
            },500); // 読み込みに最低でも0.5秒与える。読み込んでるっぽく見せる。
        }
    });

    // loading表示
    $.mobile.loading( "show", {
        text: "Loading...",
        textVisible: true,
    });
}

// 情報の追加系
function set_database(tb_c_r, tb_s_r){
    // 休講情報の登録
    var info_data = [];
    for (var i = 1; i < tb_c_r.length; i++) {
        var row_data = [];
        row_data[0] = "休";
        row_data[1] = Date.parse(tb_c_r[i].cells[1].innerText.substring(0,10)); // 日付を整数型に変換
        for (var j = 2; j <= 8; j++){
            row_data[j] = tb_c_r[i].cells[j].innerText;
        }
        row_data[4] = space_harf(tb_c_r[i].cells[4].innerText);
        info_data.push(row_data);
    }
    // 補講情報の登録
    for (var i = 1, len = tb_s_r.length; i < len; i++) {
        var row_data = [];
        row_data[0] = "補";
        row_data[1] = Date.parse(tb_s_r[i].cells[1].innerText.substring(0,10)); // 日付を整数型に変換, 曜日はブラウザによってダメだったりするからパースして削除
        for (var j = 2; j <= 8; j++){
            row_data[j] = tb_s_r[i].cells[j].innerText;
        }
        row_data[4] = space_harf(tb_s_r[i].cells[4].innerText);
        info_data.push(row_data);
    }

    // データベースに書き込み
    db.transaction(function(tx){
        clear_info_data(tx);    // 書き込みを行う前に一度初期化を行う。
        for (var i = 0; i < info_data.length; i++) {
            insert_data(tx, info_data[i]);
        }
    }, errorCB);
}

// 休講・補講データの挿入
function insert_data(tx, data){
    tx.executeSql('INSERT INTO '+info_table_name+' (state, day, time, subject, teacher, grade, class, tmp1, tmp2)\
            VALUES ("'+data[0]+'", "'+data[1]+'", "'+data[2]+'", "'+data[3]+'", "'+data[4]+'", "'+data[5]+'", "'+data[6]+'", "'+data[7]+'", "'+data[8]+'")');
}

// infoテーブルの中身を空にする
function clear_info_data(tx){
    tx.executeSql('DELETE FROM '+info_table_name);
}

// hiddenテーブルの中身を空にする
function clear_hidden_data(tx){
    tx.executeSql('DELETE FROM '+hidden_table_name);
}

// 情報の描画
function disp_info(){
    var my_data = get_my_data();
    match_str = get_regexp(my_data[0], my_data[1], my_data[2]);
    db.transaction(function(tx){
        // このへんの検索から。
        var sql_code = 'SELECT * FROM '+info_table_name+' left join '+hidden_table_name+' USING (subject) ' +match_str+ ' AND hidden_state IS NULL ORDER BY day ASC';
        // console.log("SQL code: " + sql_code);
        tx.executeSql(sql_code, [], function(tx, results){
            $('.tr_info').remove();   // 一度すべての情報を削除
            for(var i=0; i<results.rows.length; i++){
                var row_data = "";
                var day_str = get_day_str(new Date(Number(results.rows.item(i).day)));
                if (day_str == "今日"){
                    if (results.rows.item(i).state == "休"){
                        row_data += '<tr class="tr_info tr_today tr_can" data-no="'+results.rows.item(i).no+'">';
                    }else{
                        row_data += '<tr class="tr_info tr_today tr_sup" data-no="'+results.rows.item(i).no+'">';
                    }
                    row_data += '<td class="td_day tab_day tab_today">' +day_str+ '</td>';
                }else if(day_str == "明日"){
                    row_data += '<tr class="tr_info tr_tomorrow" data-no="'+results.rows.item(i).no+'">';
                    row_data += '<td class="td_day tab_day tab_tomorrow">' +day_str+ '</td>';
                }else{ // 今日・明日以外
                    row_data += '<tr class="tr_info" data-no="'+results.rows.item(i).no+'">';
                    row_data += '<td class="td_day tab_day">' +day_str+ '</td>';
                }
                if (results.rows.item(i).state == "休"){
                    row_data += '<td class="td_state tab_state state_can">';
                }else{
                    row_data += '<td class="td_state tab_state state_sup">';
                }
                row_data += results.rows.item(i).state+ '</td>';
                row_data += '<td class="td_time tab_time">' +results.rows.item(i).time+ '</td>';
                row_data += '<td class="td_sub tab_sub">' +results.rows.item(i).subject+ '</td>';
                row_data += '<td class="td_teach tab_teach">' +results.rows.item(i).teacher+ '</td>';
                row_data += '</tr>';
                $('#info_table').append(row_data);
            }
            if(results.rows.length == 0){
                var row_data = '<tr class="tr_info" id="no_sub_info"><td colspan="5">表示すべき情報がありません。<td></tr>';
                $('#info_table').append(row_data);
            }

            // 自分に関連する情報
            my_info = results;
            // set_notification(my_info);
        }, errorCB);
    }, errorCB);

    var last_update_time = get_update_time();
    $("#update_time").text("Update: " + last_update_time);
}

/*
 * データベース周りの関数
 */

// 空のデータベースを作成
function create_DB(){
    // 休講テーブルと補講テーブルの作成
    db.transaction(create_info_table, errorCB, successCB);
    db.transaction(create_hidden_table, errorCB, successCB);

    return db;
}

// 汎用的失敗時コールバック関数
function errorCB(err) {
    // alert("クエリ失敗コールバック\nエラーコード: " + err.code);
    console.log("クエリ失敗コールバック\nエラーコード: " + err.code);
}
// 成功時コールバック
function successCB() {
    console.log("successCB!");
}

// 休講テーブルを作成するクエリ
function create_info_table(tx) {
    // テーブルが作成されていない場合にテーブルを作成する。
    tx.executeSql('CREATE TABLE IF NOT EXISTS '+info_table_name+' ( no integer primary key, state, day, time, subject, teacher, grade, class, tmp1, tmp2)');
    // 番号, 休/補, 日付, 時限, 教科名, 教員名, 学年, 学科
    // tmp1: 学生への連絡/教室, tmp2: 補講の予定/備考
}
// 非表示科目テーブルを作成するクエリ
function create_hidden_table(tx){
    // テーブルが作成されていない場合にテーブルを作成する。
    tx.executeSql('CREATE TABLE IF NOT EXISTS '+hidden_table_name+' (insert_no integer primary key, subject, hidden_state DEFAULT true)');
    // 非表示科目管理番号?, 教科名, 表示にするかフラグ(デフォルト true)
}

// 保存されている値を取得し返す
// データがない場合はデフォルト値を入れる
function get_my_data(){
    var grade = localStorage.getItem('grade');
    if(grade == null){
        grade = 'all';
    }
    var cls = localStorage.getItem('cls');
    if(cls == null){
        cls = 'all';
    }
    var com = localStorage.getItem('com');
    if(com == null){
        com = 'true';
    }

    return [grade, cls, com];
}

function get_update_time(){
    var last_update_time = localStorage.getItem('last_update_time');
    if(last_update_time == null){
        last_update_time = "更新履歴はありません。";
    }
    return last_update_time;
}

// 設定情報からデータベース検索の正規表現を作成する
// android版と関数の仕様が結構異なる。
function get_regexp(grade, cls, com){
    var sql_str = '';
    sql_str += ' WHERE';

    var grade_str = ' grade LIKE';
    if(grade == 'all'){
        grade_str += ' "%"';
    }else{
        grade_str += ' "%'+grade+'%"';
    }
    sql_str += grade_str;

    // クラスの判定
    var cl = "";
    switch (cls){
        case 'all':
            cl = 'all';
            break;
        case '1':
            cl = '機械';
            break;
        case '2':
            cl = '電気・電子情';
            break;
        case '3':
            cl = '情報・知能';
            break;
        case '4':
            cl = '環境・生命';
            break;
        case '5':
            cl = '建築・都市';
            break;
        default:
            // undefined(設定前なら)
            cl = 'all';
            break;
    }

    if(cl == 'all'){
        cls_str = '';
    }else{
        if(com == 'true'){
            sql_str += ' AND (class LIKE "%' +cl+ '%" OR class LIKE "%共通%")';
        }else{
            sql_str += ' AND class LIKE "%' +cl+ '%"';
        }
    }

    return sql_str;
}


/*
 *  その他汎用関数
 */

// プラグインとしてカスタマイズしたalertを使えるようにする。
// cordova plugin add cordova-plugin-dialogs
function showAlert(message, title){
    if ( navigator.notification ){
        navigator.notification.alert( message, null, title, 'OK' );
    }else{
        alert( title ? (title + ": " + message) : message );
    }
}

// Dateを日付(文字列)に直す
function get_day_str(date){
    var y = date.getFullYear();
    var m = date.getMonth()+1;  // 得られる月が0-11なため
    var d = date.getDate();
    var w = date.getDay();
    var week = ["日","月","火","水","木","金","土"];

    // 本日の情報
    var ty = today.getFullYear();
    var tm = today.getMonth()+1;
    var td = today.getDate();

    if ((ty == y) && (tm == m)){
        if (td == d){
            return "今日";
        }else if(td+1 == d){
            return "明日";
        }
    }

    // 本当に動いてるの..？
    if((ty ))


        ys = String(y);

    ds = d<10 ? "0" + String(d) : ds = String(d);
    ms = m<9 ? "0" + String(m) : String(m);
    ws = week[w];

    // str = ys + "/" + ms + "/" + ds + "(" + ws + ")";
    str = ms+ "/" +ds+ " (" +ws+ ")";

    return str;
}

// 日付の年からの表示
function get_full_date(date){
    var year  = toDD(date.getFullYear());
    var month = toDD(date.getMonth() + 1);
    var day   = toDD(date.getDate());
    var hour  = toDD(date.getHours());
    var min   = toDD(date.getMinutes());
    var sec   = toDD(date.getSeconds());

    return year+ "." + month + "." + day + " - " + hour + ":" + min + ":" +sec;
}

// 1桁の数字を2桁に変換する
var toDD = function(n) {
    n += "";
    if (n.length === 1) {
        n = "0" + n;
    }
    return n;
};

function str2bool(str){
    return (str === 'true') ? true : false;
}

// 文字列中に含まれる全角スペースを半角に置き換える
// 教員名には全角スペースと半角スペースがどちらも存在している。
function space_harf(string){
    return string.replace(/　/g," ");
}

/* ---------------------------
 *  オーバーレイについての設定
 * --------------------------- */
$(function() {
    // テーブルをクリックした時の動作
    $(document).on( 'click', '.tr_info', function(){
        var no = Number($(this).attr('data-no'));
        db.transaction(function(tx){
            var query_str = 'SELECT * FROM '+info_table_name+ ' WHERE no='+no;
            tx.executeSql( query_str, [], function(tx, results){
                $('#detail_sub').text(results.rows.item(0).subject);
                var day_str = get_day_str(new Date(Number(results.rows.item(0).day)));
                $('#detail_day').text(day_str);
                $('#detail_time').text(results.rows.item(0).time);
                $('#detail_teacher').text(results.rows.item(0).teacher);
                $('#detail_grade').text(results.rows.item(0).grade);
                $('#detail_class').text(results.rows.item(0).class);
                if(results.rows.item(0).state == "休"){
                    $('#info_title').text('休講情報');
                    $('#detail_tmp1_title').text('補講予定');
                    $('#detail_tmp2_title').text('連絡');
                    $('#detail_tmp1').text(results.rows.item(0).tmp2);
                    $('#detail_tmp2').text(results.rows.item(0).tmp1);
                }else{
                    $('#info_title').text('補講情報');
                    $('#detail_tmp1_title').text('教室');
                    $('#detail_tmp2_title').text('備考');
                    $('#detail_tmp1').text(results.rows.item(0).tmp1);
                    $('#detail_tmp2').text(results.rows.item(0).tmp2);
                }
            }, errorCB);
        }, errorCB);
        $('#sub_button').prop('checked', false).checkboxradio().checkboxradio("refresh");
        $('#over_wrap').trigger('create');
        // ダイアログの呼び出し
        $.mobile.changePage('#dialog', { transition: "pop", role: "dialog"});
    });

    // 非表示科目を追加をクリックした際の動作
    $('#sub_button').change(function(){
        var sub_name = $('#detail_sub').text();
        if($(this).is(':checked')){
            set_hidden_subject(sub_name);
            disp_info();
        }else{
            del_hidden_subject(sub_name);
            disp_info();
        }
    });

    // 再表示ボタンの動作
    $(document).on( 'click', '.del_hibben_button', function(){
        var sub_name = $(this).parents('.tr_hidden_sub').find('.td_hidden_sub').text();
        del_hidden_subject(sub_name);
        disp_hidden_list(); // 更新
    });
});
