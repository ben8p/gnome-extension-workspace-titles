const St = imports.gi.St;
const Main = imports.ui.main;
const Gio = imports.gi.Gio;
const Me = imports.misc.extensionUtils.getCurrentExtension();

class WorkspaceTitle {
	constructor() {
		this._texts = [];

		this._showHandler = Main.overview.connect('showing', this._showTitles.bind(this));
		this._hideHandler = Main.overview.connect('hiding', this._hideTitles.bind(this));
	}

	_getSettings() {
		const GioSSS = Gio.SettingsSchemaSource;
		const schemaSource = GioSSS.new_from_directory(Me.dir.get_child("schemas").get_path(), GioSSS.get_default(), false);
		const schemaObj = schemaSource.lookup('org.gnome.shell.extensions.workspace_titles', true);
		if (!schemaObj) {
			throw new Error('cannot find schemas');
		}
		return new Gio.Settings({ settings_schema: schemaObj });
	}

	_getThumbnails() {
		const possiblePath = [
			'Main.overview._overview._overview._controls._thumbnailsBox._thumbnails',
			'Main.overview._overview._controls._thumbnailsBox._thumbnails',
			'Main.overview._controls._thumbnailsBox._thumbnails',
		];

		for(let i = 0; i < possiblePath.length; i++) {
			const currentPath = possiblePath[i];
			const segments = currentPath.split('.');
			segments.shift(); // remove `Main` because we always start from there
			let root = Main;
			for(let j = 0; j < segments.length; j++) {
				const segment = segments[j];
				if(segment in root) {
					root = root[segment];
					if(j === segments.length - 1) {
						return root;
					}
				} else {
					break;
				}
			}
		}
		
		throw new Error('Could not find thumbnails, please raise a bug');
	}

	_hideTitles() {
		const thumbnails = this._getThumbnails();
		const settings = this._getSettings();
		const titles = settings.get_strv('titles');
		for (let i = 0; i < thumbnails.length; i++) {
			if(this._texts[i]) {
				const text = this._texts[i].get_clutter_text().get_text();
				titles[i] = text;
				settings.set_strv('titles', titles);
				thumbnails[i].actor.remove_actor(this._texts[i]);
			}
		}
	}

	_showTitles() {
		const monitor = Main.layoutManager.primaryMonitor;
		const thumbnails = this._getThumbnails();
		const settings = this._getSettings();
		const titles = settings.get_strv('titles');
		for (let i = 0; i < thumbnails.length; i++) {
			if(!this._texts[i]) {
				this._texts[i] = new St.Entry({
					style_class: 'workspace-title',
					reactive: true,
				});
				const text = this._texts[i].get_clutter_text();
				text.set_text(titles[i] || 'untitled');
				// prevent entering the workspace when trying to enter a title
				this._texts[i].connect('button-release-event', () => true);
	
				// show title at bottom of workspace
				this._texts[i].set_position(0, Math.floor(.75 * monitor.height));
				this._texts[i].set_size(Math.floor(monitor.width), Math.floor(.25 * monitor.height));
			
				const texts = this._texts;
				const cleanup = () => {
					texts[i] = null;
				};
				texts[i].connect('destroy', cleanup);
			}

			thumbnails[i].actor.add_actor(this._texts[i]);
		}
	}

	destroy() {
		Main.overview.disconnect(this._showHandler);
		Main.overview.disconnect(this._hideHandler);
	}
};


let workspaceTitle;

function init() {
}

function enable() {
	workspaceTitle = new WorkspaceTitle();
}

function disable() {
	workspaceTitle.destroy();
}
