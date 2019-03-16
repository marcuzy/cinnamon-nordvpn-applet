const Applet = imports.ui.applet;
const Util = imports.misc.util;
const GLib = imports.gi.GLib;
const PopupMenu = imports.ui.popupMenu;
const Gio = imports.gi.Gio;

/**
 * spawnCommandLineAsync:
 * @command: a command
 * @callback (function): called on success or failure
 * @opts (object): options: argv, flags, input
 *
 * Runs @command in the background. Callback has three arguments -
 * stdout, stderr, and exitCode.
 *
 * Returns (object): a Gio.Subprocess instance
 */
function spawnCommandLineAsync(command, callback, opts = {}) {
    let {argv, flags, input} = opts;
    if (!input) input = null;

    let subprocess = new Gio.Subprocess({
        argv: argv ? argv : ['bash', '-c', command],
        flags: flags ? flags
            : Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDIN_PIPE | Gio.SubprocessFlags.STDERR_PIPE,
    });
    subprocess.init(null);
    let cancellable = new Gio.Cancellable();

    subprocess.communicate_utf8_async(input, cancellable, (obj, res) => {
        let success, stdout, stderr, exitCode;

        function tryFn(callback, errCallback) {
            try {
                return callback();
            } catch (e) {
                if (typeof errCallback === 'function') {
                    return errCallback(e);
                }
            }
        };
        
        // This will throw on cancel with "Gio.IOErrorEnum: Operation was cancelled"
        tryFn(() => [success, stdout, stderr] = obj.communicate_utf8_finish(res));
        if (typeof callback === 'function' && !cancellable.is_cancelled()) {
            if (stderr && stderr.indexOf('bash: ') > -1) {
                stderr = stderr.replace(/bash: /, '');
            }
            exitCode = success ? subprocess.get_exit_status() : -1;
            callback(stdout, stderr, exitCode);
        }
        subprocess.cancellable = null;
    });
    subprocess.cancellable = cancellable;

    return subprocess;
}

class NordVPNClient {
    async connect(country) {
        return this._call(`connect ${country}`);
    }

    async disconnect() {
        return this._call('disconnect');
    }

    async getStatus() {
        // Status: Connected
        // Current server: au271.nordvpn.com
        // Country: Australia
        // City: Melbourne
        // Your new IP: 144.48.37.83
        // Current protocol: UDP
        // Transfer: 8.5 KiB received, 5.4 KiB sent
        // Uptime: 3 seconds
        const res = {
       
        };

        const stdout = await this._call('status');

        [...(stdout.match(/[A-Z][\w ]+: .+/gm) || [])]
            .map(_ => _.trim().split(': '))
            .filter(_ => _.length === 2)
            .forEach(([key, value]) => res[key] = value);

        return res;
    }

    async getCountries() {
        const stdout = await this._call('countries');

        return [ ...stdout.match(/[A-Z][a-zA-Z_]+/gm).sort() ];
    }

    async _call(cmd) {
        //global.log(`call ${cmd}`);
        return new Promise((resolve, reject) => {
            spawnCommandLineAsync(`nordvpn ${cmd}`, (stdout, stderr, exitCode) => {
                //global.log(`Result of ${cmd}: ${stdout} ${stderr} ${exitCode}`);
                if (exitCode === -1) {
                    reject(stderr);
                } else {
                    resolve(stdout);
                }

                resolve(stdout);
            });
        });
    }
}

class MyApplet extends Applet.IconApplet {
    constructor(metadata, orientation, panel_height, instance_id) {
        super(orientation, panel_height, instance_id);

        this.set_applet_icon_path(metadata.path + '/icon.png');
        //this.set_applet_tooltip(_(""));

        this.menuManager = new PopupMenu.PopupMenuManager(this);
        this.menu = new Applet.AppletPopupMenu(this, orientation);
        this.menuManager.addMenu(this.menu);
        this.nordVPN = new NordVPNClient();

        this._initMenu();
    }

    async on_applet_clicked() {
        const status = await this.nordVPN.getStatus();

        let text = status['Status'];

        if (status['Status'] === 'Connected') {
            text += ` to ${status['Country']}`;

            if (!this.disconnectMenuItem) {
                this.disconnectMenuItem = new PopupMenu.PopupMenuItem('Disconnect');

                this.disconnectMenuItem.connect('activate', async () => {
                    this.nordVPN.disconnect();
                    this.menu.close();
                });

                this.menu.addMenuItem(this.disconnectMenuItem);
            }
        } else {
            if (this.disconnectMenuItem) {
                this.disconnectMenuItem.destroy();
                this.disconnectMenuItem = null;
            }
        }

        this.statusMenuItem.label.set_text(text);
        this.menu.toggle();
    }

    async _initMenu() {
        const countries = await this.nordVPN.getCountries();

        const subMenusByAlphabet = new Map();

        countries.forEach(country => {
            const letter = country[0];

            if (!subMenusByAlphabet.has(letter)) {
                const subMenuItem = new PopupMenu.PopupSubMenuMenuItem(letter);

                subMenusByAlphabet.set(letter, subMenuItem);

                this.menu.addMenuItem(subMenuItem);
            }

            const item = new PopupMenu.PopupMenuItem(country);

            item.connect('activate', async () => {
                await this.nordVPN.disconnect();
                this.nordVPN.connect(country);
                
                this.menu.close();
            });

            subMenusByAlphabet.get(letter).menu.addMenuItem(item);
        });

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        this.statusMenuItem = new PopupMenu.PopupMenuItem('...');
        this.menu.addMenuItem(this.statusMenuItem);
    }
}

function main(metadata, orientation, panel_height, instance_id) {
    return new MyApplet(metadata, orientation, panel_height, instance_id);
}