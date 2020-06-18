/** Manager for settings mainly used in the extension popup */
class SettingManager {


    /** Set current settings on Dom objects */
    static async set(s, config = this.config) {
        s = s || await Chrome.get();
        for (const k in config) {
            const c = config[k];
            this.handlers[c](k, s[k]);
        }
    }

    /** Set current settings on Dom objects */
    static save(s = {}, config = this.config) {
        for (const k in config) {
            const c = config[k];
            (s[k] = this.handlers[c](k)) != null || delete s[k];
        }
        Chrome.set(s);
    }


    /** Dom presentation of each settings */
    static config = {
        useragent: 'checkbox',
        autoplay: 'checkbox',
        thumbnails: 'checkbox',
        captcha: 'checkbox',
        defaultserver: 'select',
        lite: 'radio',
        markAsSeen: 'checkbox',
        notifyLastTime: 'checkbox',
        player: 'select',
        prepareNextPrev: 'checkbox',
        quality: 'select',
        'servers.moe': 'checkbox',
        'servers.mp4upload': 'checkbox',
        'servers.nova': 'checkbox',
        'servers.beta': 'checkbox',
        'servers.hydrax': 'checkbox',
        shortcuts: 'checkbox',
        ttip: 'checkbox',
        updates: 'multiple'
    }

    /** Getter and setter for each type of setting */
    static handlers = {
        checkbox: (name, val) => {
            const q = `input[type=checkbox][name="${name}"]`;
            if (!$(q).length) return null;
            if (typeof val != 'undefined') $(q).prop('checked', val);
            return $(q)[0].checked;
        },
        select: (name, val) => {
            const q = `select[name="${name}"]`;
            if (!$(q).length) return null;
            if (typeof val != 'undefined') $(q).val(val);
            return $(q).val();
        },
        radio: (name, val) => {
            if (!$(`input[type=radio][name="${name}"]`).length) return null;
            if (typeof val != 'undefined')
                $(`input[type=radio][name="${name}"][value="${val}"]`).prop('checked', true);
            return $(`input[type=radio][name="${name}"]:checked`).val();
        },
        multiple: (name, val) => {
            const q = `input[name="${name}"]`;
            if (!$(q).length) return null;
            if (typeof val != 'undefined')
                val.forEach((v, i) =>
                    $(`${q}[value="${v}"]`)[0].checked || $(`${q}[value="${v}"]`).click()
                );

            return $(`${q}:checked`).toArray().map(el => $(el).val());
        }
    }
}