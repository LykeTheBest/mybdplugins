/**
 * @name EditChannels
 * @author DevilBro
 * @authorId 278543574059057154
 * @version 4.5.2
 * @description Allows you to locally edit Channels
 * @invite Jx3TjNS
 * @donate https://www.paypal.me/MircoWittrien
 * @patreon https://www.patreon.com/MircoWittrien
 * @website https://mwittrien.github.io/
 * @source https://github.com/mwittrien/BetterDiscordAddons/tree/master/Plugins/EditChannels/
 * @updateUrl https://mwittrien.github.io/BetterDiscordAddons/Plugins/EditChannels/EditChannels.plugin.js
 */

module.exports = (_ => {
	const changeLog = {
		
	};

	return !window.BDFDB_Global || (!window.BDFDB_Global.loaded && !window.BDFDB_Global.started) ? class {
		constructor (meta) {for (let key in meta) this[key] = meta[key];}
		getName () {return this.name;}
		getAuthor () {return this.author;}
		getVersion () {return this.version;}
		getDescription () {return `The Library Plugin needed for ${this.name} is missing. Open the Plugin Settings to download it. \n\n${this.description}`;}
		
		downloadLibrary () {
			require("request").get("https://mwittrien.github.io/BetterDiscordAddons/Library/0BDFDB.plugin.js", (e, r, b) => {
				if (!e && b && r.statusCode == 200) require("fs").writeFile(require("path").join(BdApi.Plugins.folder, "0BDFDB.plugin.js"), b, _ => BdApi.showToast("Finished downloading BDFDB Library", {type: "success"}));
				else BdApi.alert("Error", "Could not download BDFDB Library Plugin. Try again later or download it manually from GitHub: https://mwittrien.github.io/downloader/?library");
			});
		}
		
		load () {
			if (!window.BDFDB_Global || !Array.isArray(window.BDFDB_Global.pluginQueue)) window.BDFDB_Global = Object.assign({}, window.BDFDB_Global, {pluginQueue: []});
			if (!window.BDFDB_Global.downloadModal) {
				window.BDFDB_Global.downloadModal = true;
				BdApi.showConfirmationModal("Library Missing", `The Library Plugin needed for ${this.name} is missing. Please click "Download Now" to install it.`, {
					confirmText: "Download Now",
					cancelText: "Cancel",
					onCancel: _ => {delete window.BDFDB_Global.downloadModal;},
					onConfirm: _ => {
						delete window.BDFDB_Global.downloadModal;
						this.downloadLibrary();
					}
				});
			}
			if (!window.BDFDB_Global.pluginQueue.includes(this.name)) window.BDFDB_Global.pluginQueue.push(this.name);
		}
		start () {this.load();}
		stop () {}
		getSettingsPanel () {
			let template = document.createElement("template");
			template.innerHTML = `<div style="color: var(--header-primary); font-size: 16px; font-weight: 300; white-space: pre; line-height: 22px;">The Library Plugin needed for ${this.name} is missing.\nPlease click <a style="font-weight: 500;">Download Now</a> to install it.</div>`;
			template.content.firstElementChild.querySelector("a").addEventListener("click", this.downloadLibrary);
			return template.content.firstElementChild;
		}
	} : (([Plugin, BDFDB]) => {
		var changedChannels = {};
		var appTitleObserver;
	
		return class EditChannels extends Plugin {
			onLoad () {
				this.defaults = {
					general: {
						changeChannelIcon:	{value: true, 			description: "Change Color of Channel Icon"}
					},
					places: {
						chatTextarea:		{value: true, 			description: "Chat Textarea"},
						chatWindow:			{value: true, 			description: "Messages"},
						mentions:			{value: true, 			description: "Mentions"},
						channelList:		{value: true, 			description: "Channel/Group List"},
						channelHeader:		{value: true, 			description: "Channel/Group Header"},
						recentDms:			{value: true, 			description: "Group Notifications"},
						recentMentions:		{value: true, 			description: "Recent Mentions Popout"},
						threads:			{value: true, 			description: "Thread Overview"},
						autocompletes:		{value: true, 			description: "Autocomplete Menu"},
						auditLog:			{value: true, 			description: "Audit Log"},
						inviteLog:			{value: true, 			description: "Invite Log"},
						quickSwitcher:		{value: true, 			description: "Quick Switcher"},
						searchResults:		{value: true, 			description: "Search Results"},
						searchPopout:		{value: true, 			description: "Search Popout"},
						appTitle:			{value: true, 			description: "Discord App Title (Channels)"}
					}
				};
			
				this.modulePatches = {
					before: [
						"AuditLogEntry",
						"AutocompleteChannelResult",
						"ChannelEmptyMessages",
						"ChannelsList",
						"ChannelTextAreaEditor",
						"ChannelThreadItem",
						"GuildInvites",
						"MessageContent",
						"QuickSwitchChannelResult",
						"RecentsChannelHeader",
						"SearchPopout",
						"SystemMessageWrapper",
						"ThreadMessageAccessories"
					],
					after: [
						"AuditLogEntry",
						"AutocompleteChannelResult",
						"ChannelItem",
						"ChannelThreadItem",
						"DirectMessage",
						"FocusRingScope",
						"HeaderBarContainer",
						"PrivateChannel",
						"QuickSwitchChannelResult",
						"RecentsChannelHeader",
						"RichChannelMention",
						"SearchResultsInner",
						"SystemMessageThreadCreated",
						"ThreadCard",
						"ThreadMessageAccessories",
						"ThreadSidebar"
					]
				};
				
				this.patchPriority = 9;
				
				this.css = `
					${BDFDB.dotCN.messagespopoutchannelname}:hover > span[style*="color"],
					${BDFDB.dotCN.recentmentionschannelname}:hover span[style*="color"],
					${BDFDB.dotCN.searchresultschannelname}:hover > span[style*="color"] {
						text-decoration: underline;
					}
				`;
			}
			
			onStart () {
				appTitleObserver = new MutationObserver(_ => this.changeAppTitle());
				appTitleObserver.observe(document.head.querySelector("title"), {childList: true});

				BDFDB.PatchUtils.patch(this, BDFDB.LibraryModules.QuerySearchUtils, "queryChannels", {after: e => {
					if (!e.methodArguments[0].query) return;
					for (let id of BDFDB.LibraryModules.SortedGuildUtils.getFlattenedGuildIds().map(id => Object.keys(BDFDB.LibraryStores.ChannelStore.getMutableGuildChannelsForGuild(id))).flat()) {
						let channel = BDFDB.LibraryStores.ChannelStore.getChannel(id);
						if (channel && !channel.isCategory()) {
							let category = channel.parent_id && BDFDB.LibraryStores.ChannelStore.getChannel(channel.parent_id);
							if (((changedChannels[id] && changedChannels[id].name && changedChannels[id].name.toLocaleLowerCase().indexOf(e.methodArguments[0].query.toLocaleLowerCase()) > -1) || (category && changedChannels[category.id] && changedChannels[category.id].name && changedChannels[category.id].name.toLocaleLowerCase().indexOf(e.methodArguments[0].query.toLocaleLowerCase()) > -1)) && !e.returnValue.find(n => n.record && n.record.id == id && (n.type == BDFDB.DiscordConstants.AutocompleterResultTypes.VOICE_CHANNEL || n.type == BDFDB.DiscordConstants.AutocompleterResultTypes.TEXT_CHANNEL))) e.returnValue.push({
								comparator: channel.name,
								record: channel,
								score: 30000,
								sortable: channel.name.toLocaleLowerCase(),
								type: channel.isGuildVocal() ? BDFDB.DiscordConstants.AutocompleterResultTypes.VOICE_CHANNEL : BDFDB.DiscordConstants.AutocompleterResultTypes.TEXT_CHANNEL
							});
						}
					}
				}});
				
				this.forceUpdateAll();
			}
			
			onStop () {
				if (appTitleObserver) appTitleObserver.disconnect();
				this.forceUpdateAll();
			}

			getSettingsPanel (collapseStates = {}) {
				let settingsPanel;
				return settingsPanel = BDFDB.PluginUtils.createSettingsPanel(this, {
					collapseStates: collapseStates,
					children: _ => {
						let settingsItems = [];
						
						settingsItems.push(Object.keys(this.defaults.general).map(key => BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.SettingsSaveItem, {
							type: "Switch",
							plugin: this,
							keys: ["general", key],
							label: this.defaults.general[key].description,
							value: this.settings.general[key]
						})));
						
						settingsItems.push(BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.SettingsPanelList, {
							title: "Change Channels in:",
							children: Object.keys(this.defaults.places).map(key => BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.SettingsSaveItem, {
								type: "Switch",
								plugin: this,
								keys: ["places", key],
								label: this.defaults.places[key].description,
								value: this.settings.places[key]
							}))
						}));
						
						settingsItems.push(BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.SettingsItem, {
							type: "Button",
							color: BDFDB.LibraryComponents.Button.Colors.RED,
							label: "Reset all Channels",
							onClick: _ => BDFDB.ModalUtils.confirm(this, this.labels.confirm_resetall, _ => {
								BDFDB.DataUtils.remove(this, "channels");
								this.forceUpdateAll();;
							}),
							children: BDFDB.LanguageUtils.LanguageStrings.RESET
						}));
						
						return settingsItems;
					}
				});
			}

			onSettingsClosed () {
				if (this.SettingsUpdated) {
					delete this.SettingsUpdated;
					this.forceUpdateAll();
				}
			}
		
			forceUpdateAll (instant = false) {
				changedChannels = BDFDB.DataUtils.load(this, "channels");
				
				this.changeAppTitle();
				BDFDB.PatchUtils.forceAllUpdates(this);
				BDFDB.DiscordUtils.rerenderAll(instant);
			}

			onChannelContextMenu (e) {
				if (!e.instance.props.channel) return;
				let [children, index] = BDFDB.ContextMenuUtils.findItem(e.returnvalue, {id: "devmode-copy-id", group: true});
				children.splice(index > -1 ? index : children.length, 0, BDFDB.ContextMenuUtils.createItem(BDFDB.LibraryComponents.MenuItems.MenuGroup, {
					children: BDFDB.ContextMenuUtils.createItem(BDFDB.LibraryComponents.MenuItems.MenuItem, {
						label: this.labels.context_localchannelsettings,
						id: BDFDB.ContextMenuUtils.createItemId(this.name, "settings-submenu"),
						children: BDFDB.ContextMenuUtils.createItem(BDFDB.LibraryComponents.MenuItems.MenuGroup, {
							children: [
								BDFDB.ContextMenuUtils.createItem(BDFDB.LibraryComponents.MenuItems.MenuItem, {
									label: this.labels.submenu_channelsettings,
									id: BDFDB.ContextMenuUtils.createItemId(this.name, "settings-change"),
									action: _ => this.openChannelSettingsModal(e.instance.props.channel)
								}),
								BDFDB.ContextMenuUtils.createItem(BDFDB.LibraryComponents.MenuItems.MenuItem, {
									label: this.labels.submenu_resetsettings,
									id: BDFDB.ContextMenuUtils.createItemId(this.name, "settings-reset"),
									color: BDFDB.DiscordConstants.MenuItemColors.DANGER,
									disabled: !changedChannels[e.instance.props.channel.id],
									action: event => {
										let remove = _ => {
											BDFDB.DataUtils.remove(this, "channels", e.instance.props.channel.id);
											this.forceUpdateAll(true);
										};
										if (event.shiftKey) remove();
										else BDFDB.ModalUtils.confirm(this, this.labels.confirm_reset, remove);
									}
								})
							]
						})
					})
				}));
			}

			onThreadContextMenu (e) {
				this.onChannelContextMenu(e);
			}

			onGroupDMContextMenu (e) {
				this.onChannelContextMenu(e);
			}
			
			processChannelTextAreaEditor (e) {
				if (!this.settings.places.chatTextarea || e.instance.props.disabled || !e.instance.props.channel || !changedChannels[e.instance.props.channel.id] || e.instance.props.type != BDFDB.DiscordConstants.ChannelTextAreaTypes.NORMAL && e.instance.props.type != BDFDB.DiscordConstants.ChannelTextAreaTypes.NORMAL_WITH_ACTIVITY && e.instance.props.type != BDFDB.DiscordConstants.ChannelTextAreaTypes.SIDEBAR) return;
				if (changedChannels[e.instance.props.channel.id].name) e.instance.props.placeholder = BDFDB.LanguageUtils.LanguageStringsFormat("TEXTAREA_PLACEHOLDER", `#${changedChannels[e.instance.props.channel.id].name}`);
			}
			
			processChannelEmptyMessages (e) {
				if (!this.settings.places.chatWindow || !e.instance.props.channel || !changedChannels[e.instance.props.channel.id]) return;
				e.instance.props.channel = this.getChannelData(e.instance.props.channel.id);
			}
			
			processSystemMessageWrapper (e) {
				if (this.settings.places.chatWindow && e.instance.props.channel && changedChannels[e.instance.props.channel.id]) e.instance.props.channel = this.getChannelData(e.instance.props.channel.id);
			}
			
			processSystemMessageThreadCreated (e) {
				if (!this.settings.places.chatWindow || !e.instance.props.message || !e.instance.props.message.messageReference || !e.instance.props.message.messageReference.channel_id || !changedChannels[e.instance.props.message.messageReference.channel_id]) return;
				let channelName = BDFDB.ObjectUtils.get(e, "returnvalue.props.children.2.props.children.0");
				if (changedChannels[e.instance.props.message.messageReference.channel_id].name) channelName.props.children = [changedChannels[e.instance.props.message.messageReference.channel_id].name];
				this.changeChannelColor(channelName, e.instance.props.message.messageReference.channel_id);
			}
			
			processThreadMessageAccessories (e) {
				if (!this.settings.places.chatWindow || !e.instance.props.channel || !changedChannels[e.instance.props.channel.id]) return;
				if (!e.returnvalue) e.instance.props.channel = this.getChannelData(e.instance.props.channel.id);
				else {
					let channelName = BDFDB.ReactUtils.findChild(e.returnvalue, {props: [["className", BDFDB.disCN.messagesystemname]]});
					if (channelName) this.changeChannelColor(channelName, e.instance.props.channel.id);
				}
			}

			processAutocompleteChannelResult (e) {
				if (!this.settings.places.autocompletes || !e.instance.props.channel) return;
				if (!e.returnvalue) {
					if (e.instance.props.category) e.instance.props.category = this.getChannelData(e.instance.props.category.id);
					e.instance.props.channel = this.getChannelData(e.instance.props.channel.id);
				}
				else if (typeof e.returnvalue.props.children == "function") {
					let childrenRender = e.returnvalue.props.children;
					e.returnvalue.props.children = BDFDB.TimeUtils.suppress((...args) => {
						let modify = Object.assign({}, e.instance.props, e.instance.state);
						let children = childrenRender(...args);
						let icon = BDFDB.ReactUtils.findChild(children, {name: "AutocompleteRowIcon"});
						if (icon) {
							let iconType = icon.type;
							icon.type = BDFDB.TimeUtils.suppress((...args2) => {
								let iconChild = iconType(...args2);
								if (iconChild.props && iconChild.props.children && typeof iconChild.props.children.type == "function") {
									let iconChildType = iconChild.props.children.type;
									iconChild.props.children.type = BDFDB.TimeUtils.suppress((...args3) => {
										let iconSubChild = iconChildType(...args3);
										this.changeChannelIconColor(iconSubChild, e.instance.props.channel.id, modify);
										return iconSubChild;
									}, "Error in Type of AutocompleteRowIcon Child!", this);
								}
								return iconChild;
							}, "Error in Type of AutocompleteRowIcon!", this);
						}
						let channelName = BDFDB.ReactUtils.findChild(children, {name: "AutocompleteRowContentPrimary"});
						if (channelName) this.changeChannelColor(channelName.props.children, e.instance.props.channel.id, modify);
						let categoryName = e.instance.props.category && BDFDB.ReactUtils.findChild(children, {name: "AutocompleteRowContentSecondary"});
						if (categoryName) this.changeChannelColor(categoryName, e.instance.props.category.id, modify);
						return children;
					}, "Error in Children Render of AutocompleteChannelResult!", this);
				}
			}

			processAuditLogEntry (e) {
				if (!this.settings.places.auditLog) return;
				let channel = BDFDB.ObjectUtils.get(e.instance, "props.log.options.channel");
				if (!channel) return;
				if (!e.returnvalue) e.instance.props.log.options.channel = this.getChannelData(channel.id);
				else {
					let channelName = BDFDB.ReactUtils.findChild(e.returnvalue, {props: [["children", [["#" + channel.name]]]]});
					if (channelName) this.changeChannelColor(channelName, channel.id);
				}
			}

			processGuildInvites (e) {
				if (!this.settings.places.inviteLog || !e.instance.props.invites) return;
				e.instance.props.invites = Object.assign({}, e.instance.props.invites);
				for (let id in e.instance.props.invites) e.instance.props.invites[id] = new BDFDB.DiscordObjects.Invite(Object.assign({}, e.instance.props.invites[id], {channel: this.getChannelData(e.instance.props.invites[id].channel.id)}));
			}
			
			processHeaderBarContainer (e) {
				if (!this.settings.places.channelHeader) return;
				let channel = BDFDB.LibraryStores.ChannelStore.getChannel(e.instance.props.channelId);
				if (!channel) return;
				let thread;
				if (BDFDB.ChannelUtils.isThread(channel)) {
					thread = channel;
					channel = BDFDB.LibraryStores.ChannelStore.getChannel(thread.parent_id);
				}
				if (!changedChannels[channel.id] && !(thread && changedChannels[thread.id])) return;
				let channelNames = BDFDB.ReactUtils.findChild(e.returnvalue, {all: true, name: ["HeaderBarTitle", "HeaderBarChannelName"]});
				if (channelNames.length) {
					if (channelNames[0].props.children) {
						if (changedChannels[channel.id] && changedChannels[channel.id].name) channelNames[0].props.children = channel.isGroupDM() ? this.getGroupName(channel.id) : this.getChannelData(channel.id).name;
						this.changeChannelColor(channelNames[0], channel.id);
					}
					if (channelNames[0].props.channel) channelNames[0].props.channel = this.getChannelData(channel.id);
					if (thread && channelNames[1].props.children) {
						if (changedChannels[thread.id] && changedChannels[thread.id].name) channelNames[1].props.children = this.getChannelData(thread.id).name;
						this.changeChannelColor(channelNames[1], thread.id);
					}
				}
				let channelIcons = BDFDB.ReactUtils.findChild(e.returnvalue, {all: true, name: "HeaderBarTitleIcon"});
				if (channelIcons.length) {
					if (channelIcons[0].props.icon) {
						let iconRender = channelIcons[0].props.icon;
						channelIcons[0].props.icon = BDFDB.TimeUtils.suppress((...args) => {
							let icon = iconRender(...args);
							this.changeChannelIconColor(icon, channel.id);
							return icon;
						}, "Error in Channel Icon Render of HeaderBarContainer!", this);
					}
					if (thread && channelIcons[1].props.icon) {
						let iconRender = channelIcons[1].props.icon;
						channelIcons[1].props.icon = BDFDB.TimeUtils.suppress((...args) => {
							let icon = iconRender(...args);
							this.changeChannelIconColor(icon, thread.id);
							return icon;
						}, "Error in Thread Icon Render of HeaderBarContainer!", this);
					}
				}
			}
			
			processThreadSidebar (e) {
				if (!this.settings.places.channelHeader || !changedChannels[e.instance.props.channelId]) return;
				let channelName = BDFDB.ReactUtils.findChild(e.returnvalue, {name: ["HeaderBarTitle", "HeaderBarChannelName"]});
				if (channelName && channelName.props.children) {
					if (changedChannels[e.instance.props.channelId].name) channelName.props.children = this.getChannelData(e.instance.props.channelId).name;
					this.changeChannelColor(channelName, e.instance.props.channelId);
				}
				let [children, index] = BDFDB.ReactUtils.findParent(e.returnvalue, {name: "HeaderBarTitleIcon"});
				if (index > -1) {
					let icon = BDFDB.ReactUtils.createElement(children[index].props.icon, {
						className: BDFDB.disCN.channelheadericon
					});
					this.changeChannelIconColor(icon, e.instance.props.channelId);
					children[index] = BDFDB.ReactUtils.createElement("div", {
						className: BDFDB.disCN.channelheadericonwrapper,
						children: icon
					})
				}
			}

			processThreadCard (e) {
				if (!this.settings.places.threads || !changedChannels[e.instance.props.threadId]) return;
				let channelName = BDFDB.ReactUtils.findChild(e.returnvalue, {props: [["className", BDFDB.disCN.threadcardname]]});
				if (channelName) {
					if (changedChannels[e.instance.props.threadId].name) channelName.props.children = changedChannels[e.instance.props.threadId].name;
					this.changeChannelColor(channelName, e.instance.props.threadId);
				}
			}

			processFocusRingScope (e) {
				if (!e.returnvalue || !e.returnvalue.props.className) return;
				let change, hoveredEvents, channelId, nameClass, categoyClass, iconClass, modify = {};
				if (this.settings.places.channelList && e.returnvalue.props.className.indexOf(BDFDB.disCN.categoryiconvisibility) > -1) {
					change = true;
					hoveredEvents = true;
					channelId = (BDFDB.ReactUtils.findValue(e.returnvalue, "data-list-item-id") || "").split("___").pop();
					nameClass = BDFDB.disCN.categoryname;
					iconClass = BDFDB.disCN.categoryicon;
					modify = {muted: BDFDB.LibraryStores.UserGuildSettingsStore.isGuildOrCategoryOrChannelMuted(BDFDB.LibraryStores.SelectedGuildStore.getGuildId(), channelId)};
				}
				else if (this.settings.places.searchPopout && e.returnvalue.props.className.indexOf(BDFDB.disCN.searchpopoutoption) > -1) {
					change = true;
					let channel = (BDFDB.ReactUtils.findValue(e.returnvalue._owner, "result", {up: true}) || {}).channel;
					channelId = channel && channel.id;
					nameClass = BDFDB.disCN.searchpopoutresultchannel;
					categoyClass = BDFDB.disCN.searchpopoutsearchresultchannelcategory;
					iconClass = BDFDB.disCN.searchpopoutsearchresultchannelicon;
				}
				if (change && channelId) {
					if (hoveredEvents) {
						let changeColors = (wrapper, props) => {
							let color = this.chooseColor(this.getChannelDataColor(channelId), props);
							let channelName = wrapper.querySelector(`.${nameClass} > *`);
							let channelIcon = wrapper.querySelector(`.${iconClass}`);
							if (channelName && channelName.firstElementChild) channelName.firstElementChild.style.setProperty("color", color);
							if (channelIcon) {
								for (let path of channelIcon.querySelectorAll('[path*="rgba("], [path*="rgb("]')) path.setAttribute("path", color);
								for (let fill of channelIcon.querySelectorAll('[fill*="rgba("], [fill*="rgb("]')) fill.setAttribute("fill", color);
							}
						};
						let onMouseEnter = e.instance.props.children.props.onMouseEnter, onMouseLeave = e.instance.props.children.props.onMouseLeave;
						e.instance.props.children.props.onMouseEnter = BDFDB.TimeUtils.suppress(event => {
							changeColors(event.currentTarget, {hovered: true});
							return (onMouseEnter || (_ => {}))(event);
						}, "Error in onMouseEnter of ChannelItem!", this);
						e.instance.props.children.props.onMouseLeave = BDFDB.TimeUtils.suppress(event => {
							changeColors(event.currentTarget, modify);
							return (onMouseLeave || (_ => {}))(event);
						}, "Error in onMouseLeave of ChannelItem!", this);
					}
					let name = nameClass && BDFDB.ReactUtils.findChild(e.returnvalue, {props: [["className", nameClass]]});
					if (name) {
						name = name.props && name.props.children || name;
						this.changeChannelColor(BDFDB.ArrayUtils.is(name) ? name.find(c => c.type == "strong") || name[0] : name, channelId, modify);
					}
					let icon = iconClass && BDFDB.ReactUtils.findChild(e.returnvalue, {props: [["className", iconClass]]});
					if (icon) this.changeChannelIconColor(icon, channelId, modify);
					let categoryId = (BDFDB.LibraryStores.ChannelStore.getChannel(channelId) || {}).parent_id;
					if (categoryId) {
						let categoryName = categoyClass && BDFDB.ReactUtils.findChild(e.returnvalue, {props: [["className", categoyClass]]});
						if (categoryName) {
							categoryName.props.children = this.getChannelData(categoryId).name;
							this.changeChannelColor(categoryName, categoryId, modify);
						}
					}
				}
			}
			
			processChannelsList (e) {
				if (!this.settings.places.channelList || !e.instance.props.guildChannels) return;
				e.instance.props.guildChannels = new e.instance.props.guildChannels.constructor(e.instance.props.guild.id, e.instance.props.guildChannels.communitySection && e.instance.props.guildChannels.communitySection.communityRows || []);
				for (let id in e.instance.props.guildChannels.categories) e.instance.props.guildChannels.categories[id].record = this.getChannelData(id, true, e.instance.props.guildChannels.categories[id].record);
				let getChannelFromSectionRow = e.instance.props.guildChannels.getChannelFromSectionRow.bind(e.instance.props.guildChannels);
				e.instance.props.guildChannels.getChannelFromSectionRow = BDFDB.TimeUtils.suppress((...args) => {
					let returnValue = getChannelFromSectionRow(...args);
					if (returnValue) {
						returnValue = Object.assign({}, returnValue);
						if (returnValue.channel && returnValue.channel.record) returnValue.channel.record = this.getChannelData(returnValue.channel.record.id, true, returnValue.channel.record);
						if (returnValue.category && returnValue.category.record) returnValue.category.record = this.getChannelData(returnValue.category.record.id, true, returnValue.category.record);
					}
					return returnValue;
				}, "Error in getChannelFromSectionRow of ChannelsList!", this);
			}
			
			processChannelItem (e) {
				if (!this.settings.places.channelList || !e.instance.props.channel) return;
				let modify = BDFDB.ObjectUtils.extract(e.instance.props, "muted", "locked", "selected", "unread", "connected", "hovered");
				let channelName = BDFDB.ReactUtils.findChild(e.returnvalue, {props: [["className", BDFDB.disCN.channelnameinner]]});
				if (channelName) this.changeChannelColor(channelName, e.instance.props.channel.id, modify);
				let channelIcon = this.settings.general.changeChannelIcon && BDFDB.ReactUtils.findChild(e.returnvalue, {name: "ChannelItemIcon"});
				if (channelIcon && typeof channelIcon.type == "function") {
					let type = channelIcon.type;
					channelIcon.type = BDFDB.TimeUtils.suppress((...args) => {
						let returnValue = type(...args);
						if (returnValue && typeof returnValue.props.children == "function") {
							let childrenRender = returnValue.props.children;
							returnValue.props.children = BDFDB.TimeUtils.suppress((...args2) => {
								let renderedChildren = childrenRender(...args2);
								this.changeChannelIconColor(renderedChildren.props.children, e.instance.props.channel.id, modify);
								return renderedChildren;
							}, "Error in Children Render of ChannelItem!", this);
						}
						return returnValue;
					}, "Error in Type Render of ChannelItem!", this);
				}
			}

			processChannelThreadItem (e) {
				if (!this.settings.places.channelList || !e.instance.props.thread) return;
				if (!e.returnvalue) e.instance.props.thread = this.getChannelData(e.instance.props.thread.id, true, e.instance.props.thread);
				else {
					let modify = BDFDB.ObjectUtils.extract(e.instance.props, "muted", "locked", "selected", "unread", "connected", "hovered");
					let channelName = BDFDB.ReactUtils.findChild(e.returnvalue, {props: [["className", BDFDB.disCN.channelnameinner]]});
					if (channelName) this.changeChannelColor(channelName, e.instance.props.thread.id, modify);
				}
			}

			processDirectMessage (e) {
				if (!this.settings.places.recentDms || !e.instance.props.channel || !e.instance.props.channel.isGroupDM()) return;
				if (changedChannels[e.instance.props.channel.id] && changedChannels[e.instance.props.channel.id].name) {
					let tooltip = BDFDB.ReactUtils.findChild(e.returnvalue, {name: "ListItemTooltip"});
					if (tooltip) tooltip.props.text = this.getGroupName(e.instance.props.channel.id);
				}
				let avatar = BDFDB.ReactUtils.findChild(e.returnvalue, {filter: c => c && c.props && !isNaN(parseInt(c.props.id))});
				if (avatar && typeof avatar.props.children == "function") {
					let childrenRender = avatar.props.children;
					avatar.props.children = BDFDB.TimeUtils.suppress((...args) => {
						let renderedChildren = childrenRender(...args);
						if (renderedChildren && renderedChildren.props) renderedChildren.props.icon = this.getGroupIcon(e.instance.props.channel.id);
						return renderedChildren;
					}, "Error in Avatar Render of DirectMessage!", this);
				}
			}

			processPrivateChannel (e) {
				if (!this.settings.places.channelList || !e.instance.props.channel || !e.instance.props.channel.isGroupDM()) return;
				let wrapper = e.returnvalue && e.returnvalue.props.children && e.returnvalue.props.children.props && typeof e.returnvalue.props.children.props.children == "function" ? e.returnvalue.props.children : e.returnvalue;
				if (typeof wrapper.props.children == "function") {
					let process = returnvalue => {
						const wrapper = returnvalue.props.avatar ? returnvalue : BDFDB.ReactUtils.findChild(returnvalue, {props: ["avatar"]});
						if (!wrapper) return;
						if (changedChannels[e.instance.props.channel.id] && changedChannels[e.instance.props.channel.id].name) {
							wrapper.props.name = BDFDB.ReactUtils.createElement("span", {children: this.getGroupName(e.instance.props.channel.id)});
						}
						this.changeChannelColor(wrapper.props.name, e.instance.props.channel.id, BDFDB.ObjectUtils.extract(Object.assign({}, e.instance.props, e.instance.state), "hovered", "selected", "hasUnreadMessages", "muted"));
						wrapper.props.name = [wrapper.props.name];
						if (wrapper.props.avatar) wrapper.props.avatar.props.src = this.getGroupIcon(e.instance.props.channel.id);
					};
					let childrenRender = wrapper.props.children;
					wrapper.props.children = BDFDB.TimeUtils.suppress((...args) => {
						let children = childrenRender(...args);
						process(children);
						return children;
					}, "Error in Children Render of PrivateChannel!", this);
				}
				else process(wrapper);
			}
			
			processQuickSwitchChannelResult (e) {
				if (!this.settings.places.quickSwitcher || !e.instance.props.channel) return;
				if (!e.returnvalue) {
					e.instance.props.channel = this.getChannelData(e.instance.props.channel.id);
					if (e.instance.props.category) e.instance.props.category = this.getChannelData(e.instance.props.category.id);
				}
				else {
					let modify = BDFDB.ObjectUtils.extract(e.instance.props, "focused", "unread", "mentions");
					let channelName = BDFDB.ReactUtils.findChild(e.returnvalue, {props: [["className", BDFDB.disCN.quickswitchresultmatch]]});
					if (channelName) this.changeChannelColor(channelName, e.instance.props.channel.id, modify);
					let channelIcon = BDFDB.ReactUtils.findChild(e.returnvalue, {props: [["className", BDFDB.disCN.quickswitchresulticon]]});
					if (channelIcon) this.changeChannelIconColor(channelIcon, e.instance.props.channel.id, modify);
					if (e.instance.props.category) {
						let categoryName = BDFDB.ReactUtils.findChild(e.returnvalue, {props: [["className", BDFDB.disCN.quickswitchresultnote]]});
						if (categoryName) this.changeChannelColor(categoryName, e.instance.props.category.id);
					}
				}
			}

			processSearchPopout (e) {
				if (!this.settings.places.searchPopout || !BDFDB.ArrayUtils.is(BDFDB.ObjectUtils.get(e, "instance.props.resultsState.autocompletes"))) return;
				for (let autocomplete of e.instance.props.resultsState.autocompletes) if (autocomplete && BDFDB.ArrayUtils.is(autocomplete.results)) for (let result of autocomplete.results) if (result.channel) result.channel = this.getChannelData(result.channel.id);
			}
			
			processSearchResultsInner (e) {
				if (!this.settings.places.searchResults) return;
				let results = BDFDB.ReactUtils.findChild(e.returnvalue, {props: [["id", "search-results"]]});
				if (results && BDFDB.ArrayUtils.is(results.props.children)) for (let group of results.props.children) {
					let channelId = (BDFDB.ObjectUtils.get(group, "props.children.key") || "").split("-")[0];
					let channelName = channelId && changedChannels[channelId] && BDFDB.ReactUtils.findChild(group, {props: [["className", BDFDB.disCN.searchresultschannelname]]});
					if (channelName) {
						if (changedChannels[channelId].name) channelName.props.children = "#" + changedChannels[channelId].name;
						this.changeChannelColor(channelName, channelId);
					}
				}
			}
			
			processRecentsChannelHeader (e) {
				if (!this.settings.places.recentMentions || !e.instance.props.channel) return;
				if (!e.returnvalue) e.instance.props.channel = this.getChannelData(e.instance.props.channel.id);
				else {
					let [children, index] = BDFDB.ReactUtils.findParent(e.returnvalue, {props: [["className", BDFDB.disCN.recentmentionschannelnamespan]]});
					if (index > -1) {
						this.changeChannelColor(children[index], e.instance.props.channel.id);
						let icon = index > 0 && children[index-1];
						if (icon && icon.props && icon.props.width) this.changeChannelIconColor(icon, e.instance.props.channel.id);
					}
				}
			}

			processMessageContent (e) {
				if (!this.settings.places.mentions || !BDFDB.ArrayUtils.is(e.instance.props.content)) return;
				for (let ele of e.instance.props.content) if (BDFDB.ReactUtils.isValidElement(ele) && ele.type && ele.type.prototype && ele.type.prototype.renderTooltip && typeof ele.props.children == "function") {
					let children = ele.props.children({});
					if (!children || !children.props || !children.props.iconType || !children.props.className || children.props.className.indexOf("channelMention") != 0) return;
					const checkChild = channelName => {
						let guildId = BDFDB.LibraryStores.SelectedGuildStore.getGuildId();
						let channels = guildId && [].concat(BDFDB.LibraryStores.GuildChannelStore.getChannels(guildId).SELECTABLE, Object.keys(BDFDB.LibraryStores.ActiveThreadsStore.getThreadsForGuild(guildId)).map(id => ({channel: BDFDB.LibraryStores.ChannelStore.getChannel(id)})));
						if (!BDFDB.ArrayUtils.is(channels)) return;
						for (let channelObj of channels) {
							if (channelName == channelObj.channel.name) {
								let category = BDFDB.LibraryStores.ChannelStore.getChannel(channelObj.channel.parent_id);
								if (!category || category && ele.props.text == category.name) {
									if (category) {
										let categoryData = changedChannels[category.id];
										if (categoryData && categoryData.name) ele.props.text = categoryData.name;
									}
									let name = (changedChannels[channelObj.channel.id] || {}).name;
									let color = this.getChannelDataColor(channelObj.channel.id);
									if (name || color) {
										let renderChildren = ele.props.children;
										ele.props.children = BDFDB.TimeUtils.suppress((...args) => {
											let renderedChildren = renderChildren(...args);
											this.changeMention(renderedChildren, {name, color});
											return renderedChildren;
										}, "Error in Children Render of ChannelMention in MessageContent!", this);
									}
									break;
								}
							}
						}
					};
					if (typeof children.props.children == "string") checkChild(children.props.children);
					else if (BDFDB.ArrayUtils.is(children.props.children)) for (let i in children.props.children) {
						if (typeof children.props.children[i] == "string") checkChild(children.props.children[i]);
						else if (BDFDB.ArrayUtils.is(children.props.children[i])) for (let j in children.props.children[i]) if (typeof children.props.children[i][j] == "string") checkChild(children.props.children[i][j]);
					}
				}
			}
			
			processRichChannelMention (e) {
				if (!this.settings.places.mentions || !e.instance.props.id) return;
				let name = (changedChannels[e.instance.props.id] || {}).name;
				let color = this.getChannelDataColor(e.instance.props.id);
				if (!name && !color) return;
				if (typeof e.returnvalue.props.children == "function") {
					let renderChildren = e.returnvalue.props.children;
					e.returnvalue.props.children = BDFDB.TimeUtils.suppress((...args) => {
						let children = renderChildren(...args);
						this.changeMention(children, {name, color});
						return children;
					}, "Error in Children Render of RichChannelMention!", this);
				}
				else this.changeMention(e.returnvalue, {name, color});
			}

			changeAppTitle () {
				if (!this.settings.places.appTitle) return;
				let channel = BDFDB.LibraryStores.ChannelStore.getChannel(BDFDB.LibraryStores.SelectedChannelStore.getChannelId());
				let title = document.head.querySelector("title");
				if (title && channel && (document.location.href || "").indexOf(channel.id) > -1 && changedChannels[channel.id] && changedChannels[channel.id].name) {
					if (channel.isGroupDM()) BDFDB.DOMUtils.setText(title, this.getGroupName(channel.id));
					else BDFDB.DOMUtils.setText(title, (BDFDB.ChannelUtils.isTextChannel(channel) ? "#" : "") + this.getChannelData(channel.id).name);
				}
			}
			
			changeMention (mention, data) {
				if (!mention) return;
				if (data.name) {
					const changeMentionName = (child, name) => {
						if (!child) return;
						if (BDFDB.ArrayUtils.is(child)) for (let i in child) {
							if (typeof child[i] == "string" && child[i][0] == "#") {
								if (child[i] == "#") child[parseInt(i) + 1] = data.name;
								else child[i] = "#" + data.name;
							}
							else changeMentionName(child[i]);
						}
						else if (child.props) {
							if (child.props.iconType && typeof child.props.children == "string") child.props.children = data.name;
							else if (child.props.iconType && BDFDB.ArrayUtils.is(child.props.children) && child.props.children.length == 1) child.props.children = [data.name];
							else if (typeof child.props.children == "string" && child.props.children[0] == "#") child.props.children = "#" + data.name;
							else if (BDFDB.ArrayUtils.is(child.props.children)) changeMentionName(child.props.children);
						}
					};
					changeMentionName(mention);
				}
				if (data.color) mention.props.color = BDFDB.ColorUtils.convert(BDFDB.ObjectUtils.is(data.color) ? data.color[0] : data.color, "INT");
			}
			
			changeChannelColor (child, channelId, modify) {
				if (!BDFDB.ReactUtils.isValidElement(child)) return;
				let color = this.getChannelDataColor(channelId);
				if (color) {
					color = modify ? this.chooseColor(color, modify) : BDFDB.ColorUtils.convert(color, "RGBA");
					let childProp = child.props.children ? "children" : "text";
					let fontGradient = BDFDB.ObjectUtils.is(color);
					if (fontGradient) child.props[childProp] = BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.TextGradientElement, {
						gradient: BDFDB.ColorUtils.createGradient(color),
						children: child.props[childProp]
					});
					else child.props[childProp] = BDFDB.ReactUtils.createElement("span", {
						style: {color: color},
						children: child.props[childProp]
					});
				}
			}
			
			changeChannelIconColor (child, channelId, modify) {
				if (!this.settings.general.changeChannelIcon) return;
				let color = child && this.getChannelDataColor(channelId);
				if (!color) return;
				color = modify ? this.chooseColor(BDFDB.ObjectUtils.is(color) ? color[0] : color, modify) : BDFDB.ColorUtils.convert(BDFDB.ObjectUtils.is(color) ? color[0] : color, "RGBA");
				if (!color) return;
				child.props.foreground = null;
				child.props.color = color || "currentColor";
				child.props.children = [child.props.children].flat(10).filter(n => n);
				for (let c of child.props.children) {
					if (c && c.props && c.props.fill == "currentColor") c.props.fill = color || "currentColor";
					if (c && c.props && c.props.path == "currentColor") c.props.path = color || "currentColor";
				}
			}

			chooseColor (color, config) {
				if (!color) return null;
				if (BDFDB.ObjectUtils.is(config)) {
					if (config.focused || config.hovered || config.selected || config.connected) color = BDFDB.ColorUtils.change(color, 0.5);
					else if (config.muted || config.locked) color = BDFDB.ColorUtils.change(color, -0.5);
					else if (config.mentions || config.unread) color = BDFDB.ColorUtils.change(color, 0.5);
				}
				return BDFDB.ColorUtils.convert(color, "RGBA");
			}
			
			getChannelDataColor (channelId) {
				if (changedChannels[channelId] && changedChannels[channelId].color) return changedChannels[channelId].color;
				let channel = BDFDB.LibraryStores.ChannelStore.getChannel(channelId);
				let category = channel && (BDFDB.ChannelUtils.isThread(channel) ? BDFDB.LibraryStores.ChannelStore.getChannel((BDFDB.LibraryStores.ChannelStore.getChannel(BDFDB.LibraryStores.ChannelStore.getChannel(channel.id).parent_id) || {}).parent_id) : BDFDB.LibraryStores.ChannelStore.getChannel(channel.parent_id));
				if (category && changedChannels[category.id] && changedChannels[category.id].inheritColor && changedChannels[category.id].color) return changedChannels[category.id].color;
				return null;
			}
			
			getChannelData (channelId, change = true, fallbackData) {
				let channel = BDFDB.LibraryStores.ChannelStore.getChannel(channelId);
				if (!channel && BDFDB.ObjectUtils.is(fallbackData) || channel && BDFDB.ObjectUtils.is(fallbackData) && channel.name != fallbackData.name) channel = fallbackData;
				if (!channel) return new BDFDB.DiscordObjects.Channel({});
				let data = change && changedChannels[channel.id];
				if (data) {
					let nativeObject = new (fallbackData && fallbackData.constructor || BDFDB.DiscordObjects.Channel)(channel);
					nativeObject.name = data.name || nativeObject.name;
					return nativeObject;
				}
				return fallbackData || (new BDFDB.DiscordObjects.Channel(channel));
			}
			
			getGroupName (channelId) {
				let channel = this.getChannelData(channelId);
				if (channel.name) return channel.name;
				let recipients = channel.recipients.map(BDFDB.LibraryStores.UserStore.getUser).filter(n => n);
				return recipients.length > 0 ? recipients.map(u => u.toString()).join(", ") : BDFDB.LanguageUtils.LanguageStrings.UNNAMED;
			}
			
			getGroupIcon (channelId, change = true) {
				let channel = BDFDB.LibraryStores.ChannelStore.getChannel(channelId);
				if (!channel) return "";
				let data = change && changedChannels[channel.id];
				if (data) {
					if (data.removeIcon) return "";
					else if (data.url) return data.url;
				}
				return BDFDB.LibraryModules.IconUtils.getChannelIconURL(channel);
			}

			openChannelSettingsModal (channel) {
				let data = changedChannels[channel.id] || {};
				let newData = Object.assign({}, data);
				
				let iconInput;
				
				BDFDB.ModalUtils.open(this, {
					size: "MEDIUM",
					header: this.labels.modal_header,
					subHeader: channel.name,
					children: [
						BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.FormComponents.FormItem, {
							title: this.labels.modal_channelname,
							className: BDFDB.disCN.marginbottom20,
							children: [
								BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.TextInput, {
									value: data.name,
									placeholder: channel.name,
									autoFocus: true,
									onChange: value => {newData.name = value;}
								}),
								BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.FormComponents.FormDivider, {
									className: BDFDB.disCN.dividerdefault
								})
							]
						}),
						BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.FormComponents.FormItem, {
							title: this.labels.modal_colorpicker1,
							className: BDFDB.disCN.marginbottom20,
							children: [
								BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.ColorSwatches, {
									color: data.color,
									onColorChange: value => {newData.color = value;}
								})
							]
						}),
						!channel.isGroupDM() && BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.SettingsItem, {
							type: "Switch",
							margin: 20,
							label: this.labels.modal_inheritcolor,
							tag: BDFDB.LibraryComponents.FormComponents.FormTags.H5,
							value: channel.isCategory() && data.inheritColor,
							disabled: !channel.isCategory(),
							onChange: value => {newData.inheritColor = value;}
						}),
						channel.isGroupDM() && BDFDB.ReactUtils.createElement("div", {
							className: BDFDB.disCN.marginbottom20,
							children: [
								BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.FormComponents.FormDivider, {
									className: BDFDB.disCNS.dividerdefault + BDFDB.disCN.marginbottom20
								}),
								BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.Flex, {
									className: BDFDB.disCN.marginbottom8,
									align: BDFDB.LibraryComponents.Flex.Align.CENTER,
									direction: BDFDB.LibraryComponents.Flex.Direction.HORIZONTAL,
									children: [
										BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.FormComponents.FormTitle, {
											className: BDFDB.disCN.marginreset,
											tag: BDFDB.LibraryComponents.FormComponents.FormTags.H5,
											children: this.labels.modal_channelicon
										}),
										BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.SettingsItem, {
											type: "Switch",
											margin: 0,
											grow: 0,
											label: BDFDB.LanguageUtils.LanguageStrings.REMOVE,
											tag: BDFDB.LibraryComponents.FormComponents.FormTags.H5,
											value: data.removeIcon,
											onChange: value => {
												newData.removeIcon = value;
												if (value) {
													delete iconInput.props.success;
													delete iconInput.props.errorMessage;
													iconInput.props.disabled = true;
													BDFDB.ReactUtils.forceUpdate(iconInput);
												}
												else {
													iconInput.props.disabled = false;
													this.checkUrl(iconInput.props.value, iconInput).then(returnValue => newData.url = returnValue);
												}
											}
										})
									]
								}),
								BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.TextInput, {
									success: !data.removeIcon && data.url,
									maxLength: 100000000000000000000,
									value: data.url,
									placeholder: BDFDB.DMUtils.getIcon(channel.id),
									disabled: data.removeIcon,
									ref: instance => {if (instance) iconInput = instance;},
									onChange: (value, instance) => {
										this.checkUrl(value, instance).then(returnValue => newData.url = returnValue);
									}
								})
							]
						})
					],
					buttons: [{
						contents: BDFDB.LanguageUtils.LanguageStrings.SAVE,
						color: "BRAND",
						close: true,
						onClick: _ => {
							if (newData.color != null && !BDFDB.ObjectUtils.is(newData.color)) {
								if (newData.color[0] < 30 && newData.color[1] < 30 && newData.color[2] < 30) newData.color = BDFDB.ColorUtils.change(newData.color, 30);
								else if (newData.color[0] > 225 && newData.color[1] > 225 && newData.color[2] > 225) newData.color = BDFDB.ColorUtils.change(newData.color, -30);
							}
							
							newData.url = !newData.removeIcon ? newData.url : "";
							
							let changed = false;
							if (Object.keys(newData).every(key => newData[key] == null || newData[key] == false) && (changed = true)) {
								BDFDB.DataUtils.remove(this, "channels", channel.id);
							}
							else if (!BDFDB.equals(newData, data) && (changed = true)) {
								BDFDB.DataUtils.save(newData, this, "channels", channel.id);
							}
							if (changed) this.forceUpdateAll(true);
						}
					}]
				});
			}
			
			checkUrl (url, instance) {
				return new Promise(callback => {
					BDFDB.TimeUtils.clear(instance.checkTimeout);
					url = url && url.trim();
					if (!url || instance.props.disabled) {
						delete instance.props.success;
						delete instance.props.errorMessage;
						callback("");
						BDFDB.ReactUtils.forceUpdate(instance);
					}
					else if (url.indexOf("data:") == 0) {
						instance.props.success = true;
						delete instance.props.errorMessage;
						callback(url);
					}
					else instance.checkTimeout = BDFDB.TimeUtils.timeout(_ => BDFDB.LibraryRequires.request(url, {agentOptions: {rejectUnauthorized: false}}, (error, response, result) => {
						delete instance.checkTimeout;
						if (instance.props.disabled) {
							delete instance.props.success;
							delete instance.props.errorMessage;
							callback("");
						}
						else if (response && response.headers["content-type"] && response.headers["content-type"].indexOf("image") != -1) {
							instance.props.success = true;
							delete instance.props.errorMessage;
							callback(url);
						}
						else {
							delete instance.props.success;
							instance.props.errorMessage = this.labels.modal_invalidurl;
							callback("");
						}
						BDFDB.ReactUtils.forceUpdate(instance);
					}), 1000);
				});
			}

			setLabelsByLanguage () {
				switch (BDFDB.LanguageUtils.getLanguage().id) {
					case "bg":		// Bulgarian
						return {
							confirm_reset:						"???????????????? ???? ???????????? ???? ???????????????? ???????? ???????????",
							confirm_resetall:					"???????????????? ???? ???????????? ???? ???????????????? ???????????? ?????????????",
							context_localchannelsettings:		"?????????????????? ???? ?????????????? ??????????",
							modal_channelname:					"?????? ???? ?????????????? ??????????",
							modal_channelicon:					"??????????",
							modal_colorpicker1:					"?????????????? ???????? ???? ????????????",
							modal_header:						"?????????????????? ???? ?????????????? ??????????",
							modal_inheritcolor:					"?????????????????? ?????????? ???? ??????????????????",
							modal_invalidurl:					"?????????????????? ??????????",
							submenu_channelsettings:			"?????????????? ???? ??????????????????????",
							submenu_resetsettings:				"???????????????? ???? ????????????"
						};
					case "da":		// Danish
						return {
							confirm_reset:						"Er du sikker p??, at du vil nulstille denne kanal?",
							confirm_resetall:					"Er du sikker p??, at du vil nulstille alle kanaler?",
							context_localchannelsettings:		"Lokale kanalindstillinger",
							modal_channelname:					"Lokalt kanalnavn",
							modal_channelicon:					"Ikon",
							modal_colorpicker1:					"Lokal kanalfarve",
							modal_header:						"Lokale kanalindstillinger",
							modal_inheritcolor:					"Arv farve til underkanaler",
							modal_invalidurl:					"Ugyldig URL",
							submenu_channelsettings:			"??ndre indstillinger",
							submenu_resetsettings:				"Nulstil kanal"
						};
					case "de":		// German
						return {
							confirm_reset:						"M??chtest du diesen Kanal wirklich zur??cksetzen?",
							confirm_resetall:					"M??chtest du wirklich alle Kan??le zur??cksetzen?",
							context_localchannelsettings:		"Lokale Kanaleinstellungen",
							modal_channelname:					"Lokaler Kanalname",
							modal_channelicon:					"Symbol",
							modal_colorpicker1:					"Lokale Kanalfarbe",
							modal_header:						"Lokale Kanaleinstellungen",
							modal_inheritcolor:					"Vererbung der Farbe an Unterkan??le",
							modal_invalidurl:					"Ung??ltige URL",
							submenu_channelsettings:			"Einstellungen ??ndern",
							submenu_resetsettings:				"Kanal zur??cksetzen"
						};
					case "el":		// Greek
						return {
							confirm_reset:						"?????????? ?????????????? ?????? ???????????? ???? ?????????????????????? ???????? ???? ????????????;",
							confirm_resetall:					"?????????? ?????????????? ?????? ???????????? ???? ?????????????????????? ?????? ???? ??????????????;",
							context_localchannelsettings:		"?????????????????? ?????????????? ????????????????",
							modal_channelname:					"???????????? ?????????? ????????????????",
							modal_channelicon:					"??????????????????",
							modal_colorpicker1:					"???????????? ?????????? ????????????????",
							modal_header:						"?????????????????? ?????????????? ????????????????",
							modal_inheritcolor:					"???????????????????????? ???? ?????????? ?????? ???????????????????????? ??????????????",
							modal_invalidurl:					"???? ???????????? ?????????????????? URL",
							submenu_channelsettings:			"???????????? ??????????????????",
							submenu_resetsettings:				"?????????????????? ????????????????"
						};
					case "es":		// Spanish
						return {
							confirm_reset:						"??Est??s seguro de que deseas restablecer este canal?",
							confirm_resetall:					"??Est?? seguro de que desea restablecer todos los canales?",
							context_localchannelsettings:		"Configuraci??n de canal local",
							modal_channelname:					"Nombre del canal local",
							modal_channelicon:					"Icono",
							modal_colorpicker1:					"Color del canal local",
							modal_header:						"Configuraci??n de canal local",
							modal_inheritcolor:					"Heredar color a subcanales",
							modal_invalidurl:					"URL invalida",
							submenu_channelsettings:			"Cambiar ajustes",
							submenu_resetsettings:				"Restablecer canal"
						};
					case "fi":		// Finnish
						return {
							confirm_reset:						"Haluatko varmasti nollata t??m??n kanavan?",
							confirm_resetall:					"Haluatko varmasti nollata kaikki kanavat?",
							context_localchannelsettings:		"Paikallisen kanavan asetukset",
							modal_channelname:					"Paikallisen kanavan nimi",
							modal_channelicon:					"Kuvake",
							modal_colorpicker1:					"Paikallisen kanavan v??ri",
							modal_header:						"Paikallisen kanavan asetukset",
							modal_inheritcolor:					"Peri v??ri alikanaville",
							modal_invalidurl:					"Virheellinen URL",
							submenu_channelsettings:			"Vaihda asetuksia",
							submenu_resetsettings:				"Nollaa kanava"
						};
					case "fr":		// French
						return {
							confirm_reset:						"Voulez-vous vraiment r??initialiser cette salon?",
							confirm_resetall:					"Voulez-vous vraiment r??initialiser toutes les salons?",
							context_localchannelsettings:		"Param??tres  de la salon",
							modal_channelname:					"Nom local de la salon",
							modal_channelicon:					"Ic??ne",
							modal_colorpicker1:					"Couleur locale de la salon",
							modal_header:						"Param??tres locaux de la salon",
							modal_inheritcolor:					"H??riter de la couleur aux sous-canaux",
							modal_invalidurl:					"URL invalide",
							submenu_channelsettings:			"Modifier les param??tres",
							submenu_resetsettings:				"R??initialiser la salon"
						};
					case "hr":		// Croatian
						return {
							confirm_reset:						"Jeste li sigurni da ??elite resetirati ovaj kanal?",
							confirm_resetall:					"Jeste li sigurni da ??elite resetirati sve kanale?",
							context_localchannelsettings:		"Postavke lokalnog kanala",
							modal_channelname:					"Naziv lokalnog kanala",
							modal_channelicon:					"Ikona",
							modal_colorpicker1:					"Lokalna boja kanala",
							modal_header:						"Postavke lokalnog kanala",
							modal_inheritcolor:					"Naslijedi boju na podkanalima",
							modal_invalidurl:					"Neispravna poveznica",
							submenu_channelsettings:			"Promijeniti postavke",
							submenu_resetsettings:				"Resetiraj kanal"
						};
					case "hu":		// Hungarian
						return {
							confirm_reset:						"Biztosan vissza akarja ??ll??tani ezt a csatorn??t?",
							confirm_resetall:					"Biztosan vissza??ll??tja az ??sszes csatorn??t?",
							context_localchannelsettings:		"Helyi csatorna be??ll??t??sai",
							modal_channelname:					"Helyi csatorna neve",
							modal_channelicon:					"Ikon",
							modal_colorpicker1:					"Helyi csatorna sz??ne",
							modal_header:						"Helyi csatorna be??ll??t??sai",
							modal_inheritcolor:					"??r??kli a sz??nt az alcsatorn??kra",
							modal_invalidurl:					"??rv??nytelen URL",
							submenu_channelsettings:			"Be??ll??t??sok megv??ltoztat??sa",
							submenu_resetsettings:				"Csatorna vissza??ll??t??sa"
						};
					case "it":		// Italian
						return {
							confirm_reset:						"Sei sicuro di voler ripristinare questo canale?",
							confirm_resetall:					"Sei sicuro di voler ripristinare tutti i canali?",
							context_localchannelsettings:		"Impostazioni del canale locale",
							modal_channelname:					"Nome canale locale",
							modal_channelicon:					"Icona",
							modal_colorpicker1:					"Colore canale locale",
							modal_header:						"Impostazioni del canale locale",
							modal_inheritcolor:					"Eredita colore ai canali secondari",
							modal_invalidurl:					"URL non valido",
							submenu_channelsettings:			"Cambia impostazioni",
							submenu_resetsettings:				"Reimposta canale"
						};
					case "ja":		// Japanese
						return {
							confirm_reset:						"?????????????????????????????????????????????????????????????????????",
							confirm_resetall:					"???????????????????????????????????????????????????????????????????????????",
							context_localchannelsettings:		"?????????????????????????????????",
							modal_channelname:					"???????????????????????????",
							modal_channelicon:					"????????????",
							modal_colorpicker1:					"?????????????????????????????????",
							modal_header:						"?????????????????????????????????",
							modal_inheritcolor:					"???????????????????????????????????????",
							modal_invalidurl:					"?????????URL",
							submenu_channelsettings:			"?????????????????????",
							submenu_resetsettings:				"???????????????????????????"
						};
					case "ko":		// Korean
						return {
							confirm_reset:						"??? ????????? ????????? ???????????????????",
							confirm_resetall:					"?????? ????????? ????????? ???????????????????",
							context_localchannelsettings:		"?????? ?????? ??????",
							modal_channelname:					"?????? ?????? ??????",
							modal_channelicon:					"???",
							modal_colorpicker1:					"?????? ?????? ??????",
							modal_header:						"?????? ?????? ??????",
							modal_inheritcolor:					"?????? ????????? ?????? ??????",
							modal_invalidurl:					"????????? URL",
							submenu_channelsettings:			"?????? ??????",
							submenu_resetsettings:				"?????? ?????????"
						};
					case "lt":		// Lithuanian
						return {
							confirm_reset:						"Ar tikrai norite i?? naujo nustatyti ???? kanal???",
							confirm_resetall:					"Ar tikrai norite i?? naujo nustatyti visus kanalus?",
							context_localchannelsettings:		"Vietinio kanalo nustatymai",
							modal_channelname:					"Vietinio kanalo pavadinimas",
							modal_channelicon:					"Piktograma",
							modal_colorpicker1:					"Vietinio kanalo spalva",
							modal_header:						"Vietinio kanalo nustatymai",
							modal_inheritcolor:					"Paveld??kite spalvas subkanalams",
							modal_invalidurl:					"Neteisingas URL",
							submenu_channelsettings:			"Pakeisti nustatymus",
							submenu_resetsettings:				"I?? naujo nustatyti kanal??"
						};
					case "nl":		// Dutch
						return {
							confirm_reset:						"Weet u zeker dat u dit kanaal opnieuw wilt instellen?",
							confirm_resetall:					"Weet u zeker dat u alle kanalen opnieuw wilt instellen?",
							context_localchannelsettings:		"Lokale kanaalinstellingen",
							modal_channelname:					"Lokale kanaalnaam",
							modal_channelicon:					"Icoon",
							modal_colorpicker1:					"Lokale kanaalkleur",
							modal_header:						"Lokale kanaalinstellingen",
							modal_inheritcolor:					"Overerf kleur naar subkanalen",
							modal_invalidurl:					"Ongeldige URL",
							submenu_channelsettings:			"Instellingen veranderen",
							submenu_resetsettings:				"Kanaal resetten"
						};
					case "no":		// Norwegian
						return {
							confirm_reset:						"Er du sikker p?? at du vil tilbakestille denne kanalen?",
							confirm_resetall:					"Er du sikker p?? at du vil tilbakestille alle kanaler?",
							context_localchannelsettings:		"Lokale kanalinnstillinger",
							modal_channelname:					"Lokalt kanalnavn",
							modal_channelicon:					"Ikon",
							modal_colorpicker1:					"Lokal kanalfarge",
							modal_header:						"Lokale kanalinnstillinger",
							modal_inheritcolor:					"Arv farge til underkanaler",
							modal_invalidurl:					"Ugyldig URL",
							submenu_channelsettings:			"Endre innstillinger",
							submenu_resetsettings:				"Tilbakestill kanal"
						};
					case "pl":		// Polish
						return {
							confirm_reset:						"Czy na pewno chcesz zresetowa?? ten kana???",
							confirm_resetall:					"Czy na pewno chcesz zresetowa?? wszystkie kana??y?",
							context_localchannelsettings:		"Ustawienia kana??u lokalnego",
							modal_channelname:					"Nazwa kana??u lokalnego",
							modal_channelicon:					"Ikona",
							modal_colorpicker1:					"Kolor kana??u lokalnego",
							modal_header:						"Ustawienia kana??u lokalnego",
							modal_inheritcolor:					"Dziedzicz kolor do kana????w podrz??dnych",
							modal_invalidurl:					"Nieprawid??owy URL",
							submenu_channelsettings:			"Zmie?? ustawienia",
							submenu_resetsettings:				"Resetuj kana??"
						};
					case "pt-BR":	// Portuguese (Brazil)
						return {
							confirm_reset:						"Tem certeza que deseja redefinir este canal?",
							confirm_resetall:					"Tem certeza de que deseja redefinir todos os canais?",
							context_localchannelsettings:		"Configura????es de canal local",
							modal_channelname:					"Nome do canal local",
							modal_channelicon:					"??cone",
							modal_colorpicker1:					"Cor do Canal Local",
							modal_header:						"Configura????es de canal local",
							modal_inheritcolor:					"Herdar cor para subcanais",
							modal_invalidurl:					"URL inv??lida",
							submenu_channelsettings:			"Mudar configura????es",
							submenu_resetsettings:				"Reiniciar canal"
						};
					case "ro":		// Romanian
						return {
							confirm_reset:						"Sigur dori??i s?? reseta??i acest canal?",
							confirm_resetall:					"Sigur dori??i s?? reseta??i toate canalele?",
							context_localchannelsettings:		"Set??ri canale locale",
							modal_channelname:					"Numele canalului local",
							modal_channelicon:					"Pictogram??",
							modal_colorpicker1:					"Culoare canal local",
							modal_header:						"Set??ri canale locale",
							modal_inheritcolor:					"Mo??teni??i culoarea la sub-canale",
							modal_invalidurl:					"URL invalid",
							submenu_channelsettings:			"Schimb?? set??rile",
							submenu_resetsettings:				"Reseta??i canalul"
						};
					case "ru":		// Russian
						return {
							confirm_reset:						"???? ??????????????, ?????? ???????????? ???????????????? ???????? ???????????",
							confirm_resetall:					"???? ??????????????, ?????? ???????????? ???????????????? ?????? ?????????????",
							context_localchannelsettings:		"?????????????????? ???????????????????? ????????????",
							modal_channelname:					"?????? ???????????????????? ????????????",
							modal_channelicon:					"??????????",
							modal_colorpicker1:					"???????? ???????????????????? ????????????",
							modal_header:						"?????????????????? ???????????????????? ????????????",
							modal_inheritcolor:					"?????????????????????? ???????? ?????? ????????????????????",
							modal_invalidurl:					"???????????????? ????????????",
							submenu_channelsettings:			"???????????????? ??????????????????",
							submenu_resetsettings:				"???????????????? ??????????"
						};
					case "sv":		// Swedish
						return {
							confirm_reset:						"??r du s??ker p?? att du vill ??terst??lla den h??r kanalen?",
							confirm_resetall:					"??r du s??ker p?? att du vill ??terst??lla alla kanaler?",
							context_localchannelsettings:		"Lokala kanalinst??llningar",
							modal_channelname:					"Lokalt kanalnamn",
							modal_channelicon:					"Ikon",
							modal_colorpicker1:					"Lokal kanalf??rg",
							modal_header:						"Lokala kanalinst??llningar",
							modal_inheritcolor:					"??rva f??rg till underkanaler",
							modal_invalidurl:					"Ogiltig URL",
							submenu_channelsettings:			"??ndra inst??llningar",
							submenu_resetsettings:				"??terst??ll kanal"
						};
					case "th":		// Thai
						return {
							confirm_reset:						"?????????????????????????????????????????????????????????????????????????????????????????????",
							confirm_resetall:					"?????????????????????????????????????????????????????????????????????????????????????????????????????????",
							context_localchannelsettings:		"??????????????????????????????????????????????????????????????????",
							modal_channelname:					"????????????????????????????????????????????????",
							modal_channelicon:					"???????????????",
							modal_colorpicker1:					"??????????????????????????????????????????",
							modal_header:						"??????????????????????????????????????????????????????????????????",
							modal_inheritcolor:					"???????????????????????????????????????????????????????????????",
							modal_invalidurl:					"URL ??????????????????????????????",
							submenu_channelsettings:			"???????????????????????????????????????????????????",
							submenu_resetsettings:				"??????????????????????????????"
						};
					case "tr":		// Turkish
						return {
							confirm_reset:						"Bu kanal?? s??f??rlamak istedi??inizden emin misiniz?",
							confirm_resetall:					"T??m kanallar?? s??f??rlamak istedi??inizden emin misiniz?",
							context_localchannelsettings:		"Yerel Kanal Ayarlar??",
							modal_channelname:					"Yerel Kanal Ad??",
							modal_channelicon:					"Simge",
							modal_colorpicker1:					"Yerel Kanal Rengi",
							modal_header:						"Yerel Kanal Ayarlar??",
							modal_inheritcolor:					"Renkleri Alt Kanallara Devral",
							modal_invalidurl:					"Ge??ersiz URL",
							submenu_channelsettings:			"Ayarlar?? de??i??tir",
							submenu_resetsettings:				"Kanal?? S??f??rla"
						};
					case "uk":		// Ukrainian
						return {
							confirm_reset:						"?????????????? ?????????????? ?????? ???????????",
							confirm_resetall:					"???? ????????????????, ???? ???????????? ?????????????? ?????? ?????????????",
							context_localchannelsettings:		"???????????????????????? ???????????????????? ????????????",
							modal_channelname:					"?????????? ?????????????????? ????????????",
							modal_channelicon:					"????????????????????",
							modal_colorpicker1:					"?????????? ???????????????????? ????????????",
							modal_header:						"???????????????????????? ???????????????????? ????????????",
							modal_inheritcolor:					"?????????????????????????? ?????????? ?????? ????????????????????",
							modal_invalidurl:					"???????????????? URL-????????????",
							submenu_channelsettings:			"?????????????? ????????????????????????",
							submenu_resetsettings:				"?????????????? ??????????"
						};
					case "vi":		// Vietnamese
						return {
							confirm_reset:						"B???n c?? ch???c ch???n mu???n ?????t l???i k??nh n??y kh??ng?",
							confirm_resetall:					"B???n c?? ch???c ch???n mu???n ?????t l???i t???t c??? c??c k??nh kh??ng?",
							context_localchannelsettings:		"C??i ?????t k??nh c???c b???",
							modal_channelname:					"T??n k??nh ?????a ph????ng",
							modal_channelicon:					"Bi???u t?????ng",
							modal_colorpicker1:					"M??u k??nh ?????a ph????ng",
							modal_header:						"C??i ?????t k??nh c???c b???",
							modal_inheritcolor:					"K??? th???a m??u cho c??c k??nh ph???",
							modal_invalidurl:					"URL kh??ng h???p l???",
							submenu_channelsettings:			"Thay ?????i c??i ?????t",
							submenu_resetsettings:				"?????t l???i k??nh"
						};
					case "zh-CN":	// Chinese (China)
						return {
							confirm_reset:						"?????????????????????????????????",
							confirm_resetall:					"????????????????????????????????????",
							context_localchannelsettings:		"??????????????????",
							modal_channelname:					"??????????????????",
							modal_channelicon:					"??????",
							modal_colorpicker1:					"??????????????????",
							modal_header:						"??????????????????",
							modal_inheritcolor:					"????????????????????????",
							modal_invalidurl:					"???????????????",
							submenu_channelsettings:			"????????????",
							submenu_resetsettings:				"????????????"
						};
					case "zh-TW":	// Chinese (Taiwan)
						return {
							confirm_reset:						"?????????????????????????????????",
							confirm_resetall:					"????????????????????????????????????",
							context_localchannelsettings:		"??????????????????",
							modal_channelname:					"??????????????????",
							modal_channelicon:					"??????",
							modal_colorpicker1:					"??????????????????",
							modal_header:						"??????????????????",
							modal_inheritcolor:					"????????????????????????",
							modal_invalidurl:					"???????????????",
							submenu_channelsettings:			"????????????",
							submenu_resetsettings:				"????????????"
						};
					default:		// English
						return {
							confirm_reset:						"Are you sure you want to reset this Channel?",
							confirm_resetall:					"Are you sure you want to reset all Channels?",
							context_localchannelsettings:		"Local Channel Settings",
							modal_channelname:					"Local Channel Name",
							modal_channelicon:					"Icon",
							modal_colorpicker1:					"Local Channel Color",
							modal_header:						"Local Channel Settings",
							modal_inheritcolor:					"Inherit Color to Sub-Channels",
							modal_invalidurl:					"Invalid URL",
							submenu_channelsettings:			"Change Settings",
							submenu_resetsettings:				"Reset Channel"
						};
				}
			}
		};
	})(window.BDFDB_Global.PluginUtils.buildPlugin(changeLog));
})();
