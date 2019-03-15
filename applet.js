const Applet = imports.ui.applet;
const Util = imports.misc.util;
const GLib = imports.gi.GLib;
const PopupMenu = imports.ui.popupMenu;

function MyApplet(metadata, orientation, panel_height, instance_id) {
    this._init(metadata, orientation, panel_height, instance_id);
}

MyApplet.prototype = {
    __proto__: Applet.IconApplet.prototype,

    _init: function(metadata, orientation, panel_height, instance_id) {
        Applet.IconApplet.prototype._init.call(this, orientation, panel_height, instance_id);

        this.set_applet_icon_path(metadata.path + "/icon.png");
        this.set_applet_tooltip(_("Click here to kill a window 2"));

        this.menuManager = new PopupMenu.PopupMenuManager(this);
        this.menu = new Applet.AppletPopupMenu(this, orientation);
        this.menuManager.addMenu(this.menu);
    },

    on_applet_clicked: function() {
        const regex = /[A-Z][a-zA-Z_]+/gm;
        const items = GLib.spawn_command_line_sync('nordvpn countries')[1]
            .toString().match(regex);
            
        this.buildMenu(items);
        this.menu.toggle();
      
    },

    buildMenu: function(items) {
        this.menu.removeAll();
        let isOpen = this.menu.isOpen;
        let section = new PopupMenu.PopupMenuSection(_('Temperature'));
        
        // item.connect('activate', function() {
        //   Util.trySpawn(['xdg-open', 'https://github.com/linuxmint/cinnamon-spices-applets/issues?utf8=%E2%9C%93&q=is%3Aissue+temperature%40fevimu+']);
        // });
        for (let i = 0; i < items.length; i++) {
            section.addMenuItem(new PopupMenu.PopupMenuItem(items[i]));
        }
    
        this.menu.addMenuItem(section);
        if (isOpen) {
          this.menu.open();
        }
      },
};

function main(metadata, orientation, panel_height, instance_id) {
    return new MyApplet(metadata, orientation, panel_height, instance_id);
}