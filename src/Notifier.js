class Notifier {

    static async updatesToHTML() {
        const updates = await this.getUpdates();
        const tasks = await this.getTasks();
        let empty = true;
        const container = $('<div/>');
        if (updates && updates.notes[updates.manifest.version]) {
            empty = false;
            container.append($('<div/>', { class: 'bigChar', text: 'Upcoming updates' }));
            container.append($('<a/>', { class: 'title', text: updates.manifest.version }));
            container.append($('<ul/>', { css: { 'padding-left': '25px' } }));

            for (const note of updates.notes[updates.manifest.version])
                container.find('ul')
                    .append($('<li/>', { text: note, css: { 'margin-left': '5px', 'font-weight': 'unset' } }))
            container.find('a.title').wrap($('<p/>'));
        }
        if (tasks && (tasks.todo.length || tasks.done.length)) {
            empty = false;
            let p;
            container.append($('<div/>', { class: 'bigChar', text: 'To do' }));
            container.append(p = $('<p/>'));
            for (const task of tasks.done)
                p.append($('<div/>', { text: `✔ ${task}` }).css('font-weight', 'bold'));
            for (const task of tasks.todo)
                p.append($('<div/>', { text: `- ${task}` }).css('font-weight', 'normal'));
        }
        return empty ? null : container;
    }

    static async getUpdates() {
        const url = 'https://raw.githubusercontent.com/Sraq-Zit/slickiss/master/manifest.json';
        const manifest = JSON.parse(await req(url));
        let updates = await Chrome.get('newUpdates');
        if (manifest.version == chrome.runtime.getManifest().version) return null;
        if (updates && updates.manifest.version != chrome.runtime.getManifest().version) return updates;
        updates = { manifest: manifest };
        updates.notes = await this.getNotes();
        Chrome.set({ newUpdates: updates });
        return updates;
    }

    static async getNotes() {
        const url = 'https://raw.githubusercontent.com/Sraq-Zit/slickiss/master/CHANGELOG.md';
        let notes = {};
        try {
            let raw = await req(url);
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

    static async getTasks() {
        const url = 'https://raw.githubusercontent.com/Sraq-Zit/slickiss/master/TODO.md';
        let tasks = {
            todo: [],
            done: []
        };
        try {
            tasks = {
                todo: [],
                done: []
            }
            let raw = await req(url);
            const pattern = / - \[([ x])\](.+)/g;
            let r;
            while (r = pattern.exec(raw))
                tasks[r[1] == ' ' ? 'todo' : 'done'].push(r[2]);
        } catch (e) { }
        return tasks;
    }

}