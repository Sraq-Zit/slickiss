$(window).on('hashchange', f);
$(document).ready(f);


function f(){ 
    var id = location.hash;
    $(id).addClass("focus").css("color", "");
    setTimeout(function(){
        $(id).removeClass("focus");
    }, 1000);
}