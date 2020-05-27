
$(document).ready(() => {

    $(".op").on("click", function () {
        var cls = "." + $(this).data("body");
        console.log(cls);
        $(".body").hide();
        $(cls).show();
        $(".backward").text($(this).text());
        $(".options").addClass("hidden");
        $(".details").removeClass("hidden");
    });

    $(".backward").on("click", function () {
        $(".details").addClass("hidden");
        $(".options").removeClass("hidden");
    })

    $(".update.all").on('change', function (event) {
        $(".update").not(".all")
            .prop("checked", false).css('visibility', $(this).is(":checked") ? 'hidden' : '');
    });

    $(".hasPic").on('mouseover mouseout', function (e) {
        $(`img#${$(this).data('id')}`)[e.type == 'mouseover' ? 'show' : 'hide']();
    });

    SettingManager.set();

    $(".save").on("click", function (event) {
        const reload = $(".reload").is(this);
        SettingManager.save();

        $("body").fadeOut(250, function () {
            $("body").css("height", "50px")
                .html("<h1 style='color: #d5f406; font-size:30px; text-align:center;'> Saved ! " + (reload ? "Reloading.." : "") + " </h1>")
                .show();
            setTimeout(function () {
                if (reload) chrome.tabs.reload();
                window.close();
                if (!reload) location.reload();
            }, 700);
        });
    });
});
