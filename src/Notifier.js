class Notifier {

    static async updatesToHTML() {
        const updates = await this.getUpdates();
        if (!updates || !updates.notes[updates.manifest.version]) return null;
        const container = $('<div/>');
        container.append($('<div/>', { class: 'bigChar', text: 'Upcoming updates' }));
        container.append($('<a/>', { class: 'title', text: updates.manifest.version }));
        container.append($('<ul/>', { css: { 'padding-left': '25px' } }));

        for (const note of updates.notes[updates.manifest.version])
            container.find('ul')
                .append($('<li/>', { text: note, css: { 'margin-left': '5px', 'font-weight': 'unset' } }))

        container.find('a.title').wrap($('<p/>'));
        container.find('a.title').wrap($('<p/>'));
        return container;
    }

    static async getUpdates() {
        const url = 'https://raw.githubusercontent.com/Sraq-Zit/slickiss/master/manifest.json';
        const manifest = JSON.parse(await fetch(url).then(t => t.text()));
        let updates = await Chrome.get('newUpdates');
        if (updates && updates.manifest.version == chrome.runtime.getManifest().version) return updates;
        if (manifest.version == chrome.runtime.getManifest().version) return null;
        updates = { manifest: manifest };
        updates.notes = await this.getNotes();
        Chrome.set({ newUpdates: updates });
        return updates;
    }

    static async getNotes() {
        const url = 'https://raw.githubusercontent.com/Sraq-Zit/slickiss/master/CHANGELOG.md';
        let notes = {};
        try {
            let raw = await fetch(url).then(t => t.text());
            raw = /## (.+)/s.exec(raw)[1];
            for (let note of raw.split('\n## ')) {
                const ver = /\d(\.\d+)+/g.exec(note)[0];
                notes[ver] = [];
                note = /\n- (.+?)---/s.exec(note)[1];
                for (let n of note.split('\n- '))
                    n.trim() && notes[ver].push(n.trim());

            }
        } catch (e) { }
        return notes;
    }

}