$(document).ready(function () {
    const serverCount = 6;
    let index = serverCount;
    while ($(".batchOrder").length < serverCount) {
        var clone = $(".batchOrder").eq(0).clone();
        clone.find("span").text("(" + (index--) + ")");
        clone.find("select").val(index)
        $(".batchOrder").eq(0).after(clone);
    }

    var pValue;
    $(".batchOrder select").on('focus', function () {
            pValue = this.value;
        })
        .on("change", function () {
            $(".batchOrder select>option[value=" + this.value + "]:checked").parent().not(this).val(pValue);
            pValue = this.value;
        });

    $(".batchOrder").eq(0).parent().find("button").on('click', function () {
        $(".batchOrder select").eq(0).val(5);
        var c = 0;
        $(".batchOrder select").each(function (i, el) {
            if (i) this.value = c++;
        });

        if (this.id != "cmd") {
            $(".batchOrder select").eq(1).val(1);
            $(".batchOrder select").eq(2).val(2);
        }
    });


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

    $(".update.all").on('click', function (event) {
        if ($(this).is(":checked")) $(".update").prop("checked", true);
        $(".update").not(".all").prop("disabled", $(this).is(":checked"));
    });


    chrome.storage.sync.get(function (data) {
        $("#notifyLastTime").prop('checked', data.notifyLastTime !== false);
        $("#pre").prop('checked', data.preload != 0);
        $("#autoplay").prop('checked', data.autoplay != 0);
        $("#ttip").prop('checked', data.ttip !== false);
        $("#captcha").prop('checked', data.captcha != 0);
        $("#player").val(!isNaN(data.player) ? data.player : 1);
        if (data.lite == 0)
            $("input[name='display'][value='0']").prop('checked', true);

        if (!data.updates) data.updates = [0];
        for (var i in data.updates) $(".update").eq(data.updates[i]).click();

        if (data.batch && new Set(data.batch).size == serverCount)
            for (var i in data.batch)
                $(".batchOrder select").eq(i).val(data.batch[i]);

        if (data.markAsSeen == 1)
            $("#mark").prop('checked', true);

        if (data.prepareNextPrev == 1)
            $("#nextPrev").prop('checked', true);

        if (data.shortcuts == 0)
            $("#shortcuts").prop('checked', false);

        if (data.quality)
            $("#quality").val(data.quality);

        if (data.defaultserver && $("#server>option[value='" + data.defaultserver + "']").length)
            $("#server").val(data.defaultserver);
    });

    $("input[name='vid']").each(function (index, el) {
        var val = this.value;
        chrome.storage.sync.get('servers', function (data) {
            var settings = data.servers;
            if (settings[val] == 0)
                $(el).prop('checked', false);
        });
    });

    $(".save").on("click", function (event) {
        var json = {},
            reload = $(".reload").is(this);

        var order = [];
        $(".batchOrder select").each(function () {
            if (this.value && !isNaN(this.value) && this.value >= 0 && this.value < serverCount && !order.includes(this.value))
                order.push(Number(this.value));
            else return false;
        });
        if (order.length == serverCount)
            chrome.storage.sync.set({
                batch: order
            });

        $("input[name='vid']").each(function (index, el) {
            json[this.value] = $(this).is(':checked') ? 1 : 0
            if (this.value == "oload.stream") {
                json["oload.site"] = $(this).is(':checked') ? 1 : 0;
                json["openload.co"] = $(this).is(':checked') ? 1 : 0;
            }
        });

        chrome.storage.sync.set({
            servers: json
        });

        var ar = [];
        $(".update:checked").each(function () {
            ar.push(Number(this.value))
        });
        chrome.storage.sync.set({
            notifyLastTime: $("#notifyLastTime").is(":checked"),
            preload: $("#pre").is(':checked') ? 1 : 0,
            markAsSeen: $("#mark").is(':checked') ? 1 : 0,
            prepareNextPrev: $("#nextPrev").is(':checked') ? 1 : 0,
            shortcuts: $("#shortcuts").is(':checked') ? 1 : 0,
            autoplay: $("#autoplay").is(':checked') ? 1 : 0,
            captcha: $("#captcha").is(':checked') ? 1 : 0,
            ttip: $("#ttip").is(':checked'),
            defaultserver: $("#server").val(),
            lite: $("input[name='display']:checked").val(),
            updates: ar,
            player: $("#player").val(),
            quality: $("#quality").val()
        });

        $("body").fadeOut(250, function () {
            $("body").css("height", "50px").html("<h1 style='color: #d5f406; font-size:30px; text-align:center;'> Saved ! " + (reload ? "Reloading.." : "") + " </h1>").show();
            setTimeout(function () {
                if (reload) chrome.tabs.reload();
                window.close();
            }, 700);
        });


    });

    $("#shortcutSetting").on('click', function (event) {
        chrome.tabs.create({
            url: "custom-shortcuts.html"
        });
    });

});
