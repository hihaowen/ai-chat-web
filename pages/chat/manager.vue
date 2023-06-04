<template>
	<div id="app" :style="{'height': (windowObj.windowHeight - windowObj.statusBarHeight + 'px')}">
		<div class="sidebar" :class="{ 'sidebar-open': isOpen }">
			<div class="sidebar-content">
				<button @click="createNewSession">
					<uni-icons type="plusempty" />
					New chat
				</button>
				<div v-for="session in sessions" :key="session.id" class="session-item"
					:class="activeSession.id===session.id?'session-item-active':''">
					<div v-if="editingSessionId === session.id" class="session-edit">
						<input class="input" v-model="newTitle" focus="true" placeholder="Enter new title" />
						<button class="btn-mini" @click="saveNewTitle(session.id)">保存</button>
						<button class="btn-mini" @click="cancelEdit">取消</button>
					</div>
					<div v-else @click="switchNewSession(session.id)" class="session-info">
						<span class="session-title"
							:class="activeSession.id===session.id?'session-title-active':''">{{ session.title }}</span>
						<button v-if="activeSession.id === session.id" class="btn-mini"
							@click.stop="startEdit(session.id, session.title)">编辑</button>
						<button v-if="activeSession.id === session.id" class="btn-mini"
							@click.stop="deleteOldSession(session.id)">删除</button>
					</div>
				</div>
			</div>
		</div>
		<div class="sidebar-toggle" @click="toggleSidebar">
			<!-- 用于折叠和展开的按钮 -->
			<!-- ◀ -->
			<!-- {{ isOpen ? '◀' : '▶' }} -->
			<div class="arrow-right"></div>
		</div>
		<div class="main-content">
			<Chat :session="activeSession" :currentPageRoute="currentPageRoute" />
		</div>
	</div>
</template>

<script>
	import {
		mapState,
		mapMutations
	} from 'vuex';
	import Chat from './completion.vue';

	export default {
		components: {
			Chat,
		},
		data() {
			return {
				newTitle: '', // For editing session titles
				editingSessionId: null, // The id of the session being edited
				currentPageRoute: '',
				isOpen: false,
			};
		},
		computed: {
			...mapState(['sessions', 'activeSessionId']),
			activeSession() {
				return this.sessions.find(session => session.id === this.activeSessionId);
			},
			windowObj() {
				let obj;
				uni.getSystemInfo({
					success: res => {
						obj = res;
					}
				})

				return obj
			},
		},
		onLoad() {
			uni.setNavigationBarTitle({
				title: this.activeSession.title
			});
			this.currentPageRoute = this.$mp.page.route
		},
		methods: {
			toggleSidebar() {
				this.isOpen = !this.isOpen;
				console.log("asdasd")
			},
			...mapMutations(['createSession', 'switchSession', 'deleteSession', 'editSessionTitle']),
			createNewSession() {
				this.createSession('New Chat');
			},
			startEdit(sessionId, sessionTitle) {
				this.editingSessionId = sessionId; // Enter the editing mode
				this.newTitle = sessionTitle; // Set the initial value of the input box
			},
			saveNewTitle(sessionId) {
				this.editSessionTitle({
					sessionId,
					newTitle: this.newTitle
				});
				this.newTitle = ''; // Clear the input box
				this.editingSessionId = null; // Exit the editing mode
			},
			cancelEdit() {
				this.newTitle = ''; // Clear the input box
				this.editingSessionId = null; // Exit the editing mode
			},
			switchNewSession(newSessionId) {
				this.switchSession(newSessionId)
				uni.setNavigationBarTitle({
					title: this.activeSession.title
				});
			},
			deleteOldSession(sessionId) {
				self = this
				uni.showModal({
					title: '提示',
					content: '确定要删除吗？',
					confirmText: '确定',
					success: function(res) {
						if (res.confirm) {
							self.deleteSession(sessionId)
						}
					}
				})
			},
		},
	};
</script>

<style>
	#app {
		display: grid;
		grid-template-columns: auto 10px 1fr;
		/* Set the width of the toggle button to be 10px, and the rest of the space is occupied by the main content. */
		grid-template-rows: 1fr;
		/* Define one row that takes up all available space. */
		height: 100%;
		/* You might need to adjust this based on your actual layout. */
	}

	.sidebar {
		grid-column: 1;
		/* Let the sidebar occupy the first column. */
		grid-row: 1;
		/* Let the sidebar occupy the first row. */
		width: 0;
		transition: width 0.3s ease;
		background-color: #f6f8fa;
		position: relative;
		overflow-y: auto;
	}

	.sidebar-open {
		width: 220px;
	}

	.sidebar-content {
		padding: 10px;
		width: 200px;
		/* Set a fixed width for the sidebar content. */
		transform: translateX(-100%);
		/* Initially, move the content out of the viewport. */
		transition: transform 0.3s ease;
	}

	.sidebar-open .sidebar-content {
		transform: translateX(0);
		/* When the sidebar is open, move the content back to its original position. */
	}

	.sidebar-toggle {
		grid-column: 2;
		grid-row: 1;
		position: sticky;
		left: 0;
		top: 50%;
		transform: translateY(-50%);
		width: 10px;
		height: 100px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 20px;
		/* background-color: #40a9ff; */
		color: rgba(250, 235, 215, 1);
		cursor: pointer;
		z-index: 99999;
	}

	.arrow-right {
		position: relative;
		width: 50px;
		height: 50px;
		background: #40a9ff;
	}

	.arrow-right::before {
		content: "";
		position: absolute;
		right: -20px;
		top: 50%;
		transform: translateY(-50%);
		border: 10px solid transparent;
		border-left-color: #40a9ff;
	}

	.session-item {
		padding: 5px 5px;
		cursor: pointer;
	}

	.session-item-active {
		background-color: rgba(250, 235, 215, 1);
		border-radius: 0.3rem;
	}

	.session-edit,
	.session-info {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 0;
	}

	.session-title,
	.input {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		line-height: 1.5;
		font-size: 14px;
	}

	.session-title {
		white-space: nowrap;
		overflow: hidden;
	}

	.session-title::after {
		content: '';
		text-align: right;
	}

	.input {
		background-color: #fff;
		width: 60%;
	}

	.session-title-active {
		width: 60%;
	}

	.main-content {
		grid-column: 3;
		grid-row: 1;
		min-width: 0;
		height: 100%;
		overflow-y: auto;
	}
</style>