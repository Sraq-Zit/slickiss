$(document).ready(function() {

    function occurenceOf (crap, categ, val) {
        var keys = Object.keys(crap),
        occurences = 0;
        for(var i in keys)
            if(crap[keys[i]] == val && keys[i] != categ)
                occurences++;

        return occurences;
    }


    function getCharCode(char) {return char.charCodeAt(0);}
    var shortcuts = {
        playAndPause : getCharCode(" "),
        fullScreen : getCharCode("f"),
        nextEp : getCharCode("n"),
        prevEp : getCharCode("p"),
        skipTheme : getCharCode("s"),
        abortPreload : getCharCode("a")
    };


    chrome.storage.sync.get('customShortcuts', function(data) {
        console.log(data.customShortcuts);

        if(data.customShortcuts == undefined){
            chrome.storage.sync.set({customShortcuts: shortcuts});
        } else
            shortcuts = data.customShortcuts;

        var keys = Object.keys(shortcuts);
        for(var i in keys){
            var val = String.fromCharCode(shortcuts[keys[i]]);
            if(val == " ") val = "Spc";
            if(shortcuts[keys[i]] == 13) val = "Entr";
            $("."+keys[i]).text(val);
        }
    });


    $(".shortcut").on('click', function(event) {
        var shrtct = $(this).attr('class').split(" ")[1];
        $(".sInput").fadeIn();
        $(".shortcutInput").addClass(shrtct).text('Click shortcut').focus();
    });

    $("body").on('keypress', function(event) {
        if($(".sInput").css('display') != "none" && $(".shortcutInput").attr('class').split(" ").length == 2){
            var keycode = event.keyCode,
            key = String.fromCharCode(keycode),
            type = $(".shortcutInput").attr('class').split(" ")[1];
            if(key == " ") key = "Spc";
            if(keycode == 13) key = "Entr";
            $(".shortcutInput").css('color', '');
            $(".shortcutInput").text(key);
            if(occurenceOf(shortcuts, type, keycode) > 0){
                $(".shortcutInput").css('color', 'red');
            } else {
                shortcuts[type] = keycode;
                $("."+type).text(key);
            }
        }
    });
    $("body").on('keydown', function(event) {
        if(event.keyCode == 27)
            if($(".sInput").css('display') != "none" && $(".shortcutInput").attr('class').split(" ").length == 2)
                $(".save").click();
    });
    $(".save").on('click', function(event) {
        chrome.storage.sync.set({customShortcuts: shortcuts});
        console.log(shortcuts);
        $(".sInput").fadeOut();
        $(".shortcutInput").removeClass($(".shortcutInput").attr('class').split(" ")[1]);
    });
});