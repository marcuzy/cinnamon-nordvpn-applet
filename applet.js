const Applet = imports.ui.applet;
const Util = imports.misc.util;
const GLib = imports.gi.GLib;
const PopupMenu = imports.ui.popupMenu;

class MyApplet extends Applet.IconApplet {
    constructor(metadata, orientation, panel_height, instance_id) {
        super(orientation, panel_height, instance_id);

        this.set_applet_icon_path(metadata.path + "/icon.png");
        this.set_applet_tooltip(_("Click here to kill a window 2"));

        this.menuManager = new PopupMenu.PopupMenuManager(this);
        this.menu = new Applet.AppletPopupMenu(this, orientation);
        this.menuManager.addMenu(this.menu);

        const countries = [
            ...GLib
                .spawn_command_line_sync('nordvpn countries')[1]
                .toString()
                .match(/[A-Z][a-zA-Z_]+/gm)
                .sort()
        ];

        const countriesByAlphabet = new Map();

        countries.forEach(country => {
            const letter = country[0];

            if (!countriesByAlphabet.has(letter)) {
                const subMenuItem = new PopupMenu.PopupSubMenuMenuItem(letter);

                countriesByAlphabet.set(letter, subMenuItem);

                this.menu.addMenuItem(subMenuItem);
            }

            const item = new PopupMenu.PopupMenuItem(country);

            item.connect('activate', () => {
                Util.spawnCommandLineAsync('nordvpn disconnect', () => {
                    Util.spawnCommandLine(`nordvpn connect ${country}`);
                });
                
                this.menu.close();
            });

            countriesByAlphabet.get(letter).menu.addMenuItem(item);
        });
    }

    on_applet_clicked() {
        this.menu.toggle();
    }
}

function main(metadata, orientation, panel_height, instance_id) {
    return new MyApplet(metadata, orientation, panel_height, instance_id);
}