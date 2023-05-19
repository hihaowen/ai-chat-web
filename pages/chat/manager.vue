<template>
	<div id="app">
		<div class="sidebar">
			<button @click="createNewSession">Create new session</button>
			<div v-for="session in sessions" :key="session.id">
				<div v-if="editingSessionId === session.id">
					<input v-model="newTitle" placeholder="Enter new title" />
					<button class="btn-mini" @click="saveNewTitle(session.id)">保存</button>
					<button class="btn-mini" @click="cancelEdit">取消</button>
				</div>
				<div v-else @click="switchNewSession(session.id)">
					{{ session.title }} {{activeSession.id === session.id ? '(当前)' : ''}}
					<button class="btn-mini" @click="startEdit(session.id, session.title)">编辑</button>
					<button class="btn-mini" @click.stop="deleteSession(session.id)">删除</button>
				</div>
			</div>
		</div>
		<div class="chat-window">
			<Chat :session="activeSession" />
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
			};
		},
		computed: {
			...mapState(['sessions', 'activeSessionId']),
			activeSession() {
				return this.sessions.find(session => session.id === this.activeSessionId);
			},
		},
		onLoad() {
			uni.setNavigationBarTitle({
				title: this.activeSession.title
			});
		},
		methods: {
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
		},
	};
</script>

<style>
	#app {
		display: flex;
		height: 100vh;
	}

	.sidebar {
		width: 200px;
		padding: 20px;
		border-right: 1px solid #ccc;
		overflow: auto;
	}

	.chat-window {
		flex-grow: 1;
		overflow: auto;
		padding: 20px;
	}

	.btn-mini {
		display: inline-block;
		line-height: 1.5;
		font-size: 12px;
		padding: 0 0.5em;
	}
</style>