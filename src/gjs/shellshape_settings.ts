/// <reference path="common.ts" />
/// <reference path="logging.ts" />
module ShellshapeSettings {

	var Gio = imports.gi.Gio;
	var Glib = imports.gi.GLib;
	var Config = imports.misc.config;
	var ExtensionUtils = imports.misc.extensionUtils;
	var Ext = ExtensionUtils.getCurrentExtension();

	var SCHEMA_ROOT = 'org.gnome.shell.extensions.net.gfxmonk.shellshape';
	var KEYBINDINGS = SCHEMA_ROOT + '.keybindings';
	var PREFS = SCHEMA_ROOT + '.prefs';

	var log = Logging.getLogger("shellshape.settings");

	export function set_dconf_view() {
		get_local_gsettings('ca.desrt.dconf-editor.Settings')
			.set_string('saved-view',
				'/'+KEYBINDINGS.replace(/\./g,'/')+'/');
	}

	export function envp_with_shellshape_xdg_data_dir() {
		var xdg_data_base = Ext.dir.get_child('data');
		if(!xdg_data_base.query_exists(null)) {
			log.info("xdg dir doesn't exist - assuming global install");
			return null;
		}
		xdg_data_base = xdg_data_base.get_path();

		var XDG_DATA_DIRS = 'XDG_DATA_DIRS';
		var old_xdg_data = Glib.getenv(XDG_DATA_DIRS);
		var new_xdg_data = null;
		if(old_xdg_data != null) {
			var entries = old_xdg_data.split(':');
			if(entries.indexOf(xdg_data_base) == -1) {
				new_xdg_data = old_xdg_data + ':' + xdg_data_base;
			}
		} else {
			var default_xdg = "/usr/local/share/:/usr/share/";
			new_xdg_data = default_xdg + ":" + xdg_data_base;
		}

		//TODO: so much effort to modify one key in the environment,
		// surely there is an easier way...
		var strings = [];
		strings.push(XDG_DATA_DIRS + '=' + new_xdg_data);
		var keys = Glib.listenv();
		for(var i in keys) {
			var key = keys[i];
			if(key == XDG_DATA_DIRS) continue;
			var val = Glib.getenv(key);
			strings.push(key + '=' + val);
		};
		return strings;
	};

	function get_local_gsettings(schema_path) {
		log.info("initting schemas");
		var GioSSS = Gio.SettingsSchemaSource;

		var schemaDir = Ext.dir.get_child('data').get_child('glib-2.0').get_child('schemas');
		var schemaSource;

		if(!(schemaDir.query_exists(null))) {
			log.warn("no directory at: " + schemaDir.get_path() + " - assuming schemas globally installed");
			schemaSource = GioSSS.get_default();
		} else {
			log.warn("loading schema from: " + schemaDir.get_path());
			schemaSource = GioSSS.new_from_directory(
				schemaDir.get_path(),
				GioSSS.get_default(),
				false);
		}

		var schemaObj = schemaSource.lookup(schema_path, true);
		if (!schemaObj) {
			throw new Error(
				'Schema ' + schema_path +
				' could not be found for extension ' +
				Ext.metadata.uuid
			);
		}
		return new Gio.Settings({ settings_schema: schemaObj });
	};

	export function Keybindings() {
		var self = this;
		var settings = this.settings = get_local_gsettings(KEYBINDINGS);
		this.each = function(fn, ctx) {
			var keys = settings.list_children();
			for (var i=0; i < keys.length; i++) {
				var key = keys[i];
				var setting = {
					key: key,
					get: function() { return settings.get_string_array(key); },
					set: function(v) { settings.set_string_array(key, v); },
				};
				fn.call(ctx, setting);
			}
		};
	};

	export function Prefs() {
		var self = this;
		var settings = this.settings = get_local_gsettings(PREFS);
		var get_boolean = function():boolean { return settings.get_boolean(this.key); };
		var set_boolean = function(v:boolean) { settings.set_boolean(this.key, v); };
		var get_int = function():number { return settings.get_int(this.key); };
		var set_int = function(v:number) { settings.set_int(this.key, v); };
		var get_string = function():String { return settings.get_string(this.key); };
		var set_string = function(v:String) { settings.set_string(this.key, v); };

		this.SHOW_INDICATOR = {
			key: 'show-indicator',
			gsettings: settings,
			get: get_boolean,
			set: set_boolean,
		};
		this.MAX_AUTOTILE = {
			key: 'max-autotiled-windows',
			gsettings: settings,
			get: get_int,
			set: set_int,
		};
		this.DEFAULT_LAYOUT = {
			key: 'default-layout',
			gsettings: settings,
			get: get_string,
			set: set_string,
		};
		this.PADDING = {
			key: 'tile-padding',
			gsettings: settings,
			get: get_int,
			set: set_int,
		};
		this.SCREEN_PADDING = {
			key: 'screen-padding',
			gsettings: settings,
			get: get_int,
			set: set_int,
		};
	};

	export function initTranslations(domain?:string) {
		domain = domain || Ext.metadata['gettext-domain'];

		// check if this extension was built with "make zip-file", and thus
		// has the locale files in a subfolder
		// otherwise assume that extension has been installed in the
		// same prefix as gnome-shell
		var localeDir = Ext.dir.get_child('locale');
		if (localeDir.query_exists(null)) {
			imports.gettext.bindtextdomain(domain, localeDir.get_path());
		} else {
			imports.gettext.bindtextdomain(domain, Config.LOCALEDIR);
		}
		log.info("translations initted for " + domain);
	}

}
