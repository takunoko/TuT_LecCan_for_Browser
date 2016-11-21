// ページロード時に実行して欲しいもの
// (ボタンの機能登録とか)

// localStrage.setItemで保存できるのは"文字列形式"のみ
$(function() {
    // 学年変更時に値を変更
    $('#select_grade').change(function(){
        var grade_val = $(this).val();
        console.log("学年" + grade_val);
        localStorage.setItem('grade', grade_val);
    });
    // 学科変更時に値を保存
    $('#select_class').change(function(){
        var cls_val = $(this).val();
        localStorage.setItem('cls', cls_val);
    });
    // 共通のチェックボックス変更時に保存
    $('#com').change(function(){
        if($(this).is(':checked')){
            localStorage.setItem('com', true);
        }else{
            localStorage.setItem('com', false);
        }
    });
    // settingsへのページ遷移ボタンのリンクを踏んだら
    $('.link_settings').on('click', function(){
        disp_hidden_list();
        update_setting_display();
    });
    // うまく機能してない?
    $('.link_str').click(function(){
        var link_url = $(this).attr('data-url');
        console.log('url: '+link_url);
        window.open(link_url, '_system')
    });
});

// 保存されている値を取得し返す
// データがない場合はデフォルト値を入れる
function get_my_data(){
    var grade = localStorage.getItem('grade');
    var cls = localStorage.getItem('cls');
    var com = localStorage.getItem('com');
    if(grade == null){
        grade = 'all';
    }
    if(cls == null){
        cls = 'all';
    }
    if(com == null){
        com = "true";
    }

    return [grade, cls, com];
}

/*
    設定画面で用いるJSの関数郡
*/

// 設定画面の設定ボタンを保存されている値にする
function update_setting_display(){
    var my_data = get_my_data();
    console.log("now data: " + my_data);
    $("#select_grade option").attr("selected", false);
    $("#select_class option").attr("selected", false);

    $("#select_grade").val(my_data[0]).selectmenu('refresh');   // 見た目の変更だけならこれだけでもoK?
    // $("#select_grade option[value=" + my_data[0] + "]").attr("selected", true);
    $("#select_class").val(my_data[1]).selectmenu('refresh');
    // $("#select_class option[value=" + my_data[1] + "]").attr("selected", true);

    if(my_data[2] == "true"){
        $('#com').prop('checked', true).checkboxradio().checkboxradio("refresh");;
    }else{
        $('#com').prop('checked', false).checkboxradio().checkboxradio("refresh");;
    }

    disp_hidden_list();
}

// 非表示科目の追加
function set_hidden_subject(sub_name){
    db.transaction(function(tx){
        // すでに登録されていない授業名を追加する。
        var query_txt = 'INSERT INTO '+hidden_table_name+' (subject) SELECT "' +sub_name+ '" WHERE NOT EXISTS (SELECT subject FROM '+hidden_table_name+' WHERE subject="'+sub_name+'")';
        tx.executeSql(query_txt);
    }, errorCB);
}

// 非表示科目の削除
function del_hidden_subject(sub_name){
    db.transaction(function(tx){
        var query_txt = 'DELETE FROM '+hidden_table_name+' WHERE subject="' +sub_name+ '"';
        tx.executeSql(query_txt);
        disp_hidden_list();
    }, errorCB);
}
// 非表示リストの表示
function disp_hidden_list(){
    db.transaction(function(tx){
        // 最後に登録したものが最初にくるように
        tx.executeSql('SELECT * FROM '+hidden_table_name+' ORDER BY insert_no DESC', [], function(tx, results){
            $('.tr_hidden_sub').remove();   // 一度すべての表示情報を削除
            if(results.rows.length != 0){
                for(var i=0; i<results.rows.length; i++){
                    var row_data = "";
                    row_data += '<tr class="tr_hidden_sub">';
                    row_data += '<td class="td_hidden_button tab_hidden_button"><button class="del_hibben_button">再表示</button></td>';
                    row_data += '<td class="td_hidden_sub tab_hidden_sub">' + results.rows.item(i).subject + '</td>';
                    row_data += '</tr>';
                    $('#hidden_list_table').append(row_data);
                }
            }else{
                var row_data ='<tr class="tr_hidden_sub no_hidden_sub"><td colspan="2" class="no_hidden_sub">非表示に設定している科目はありません</td></tr>';
                $('#hidden_list_table').append(row_data);
            }
        }, errorCB);
    }, errorCB);
    console.log("get hidden listが呼ばれた");
}
