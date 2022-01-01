// Twine defines the setup object for us, and we must attach all variables,
// functions, and classes to it.

// This code is very weird in places, due to peculiarities of Twine.
// On ending a passage, Twine saves all objects, but two objects with 
// circular references cause a recursion error. 
// This means objects cannot circularly reference each other.
// On ending a passage, Twine also makes a deep copy of all variables. 
// This means the code is designed so only one variable points to a given
// object at a given time; even if they were aliases, the deep copy would
// disrupt that relationship.

setup.compare = function(oldData, newData) {
    // Compare two objects for value
    // Will not work if attributes are re-arranged, but works here
	return JSON.stringify(oldData) === JSON.stringify(newData);
}

setup.equal_ignore_case = function(str1, str2) {
	return str1.toUpperCase() === str2.toUpperCase();
}

setup.shift_command_history = function(command_history, new_command) {
	if (command_history.length >= 16) {
        // Twine dislikes unused returns, for some reason
		let removed = command_history.shift();
	}
	let commands_len = command_history.push(new_command);
}

setup.format_command_history = function(command_history) {
	return command_history.join("\n");
}

setup.is_valid_object_name = function(input) {
    // File objects should not contains letters, numbers, -, and .
	let pattern = /^[.\w\-]*$/;
	let valid_chars = pattern.test(input);
	let not_reserved = (input !== "" && input !== "." && input !== "..")
	return not_reserved && valid_chars && (input.length > 0);
}

setup.is_valid_username = function(input) {
	return setup.is_valid_object_name(input) && input.length <= 10;
}

setup.split_lines = function(line) {
	if (line.length <= 80) {
		return line;
	}
	return line.slice(0, 80) + "\n" + setup.split_lines(line.slice(80, line.length));
}

setup.decorate_prompt = function(login, wd) {
	return "[" + login + "@computer " + wd + "] $ ";
}

setup.decorate_new_message = function(new_message) {
	return "@@color:green;" + new_message + "@@";
}

setup.decorate_file = function(file) {
	return "@@color:darkviolet;" + file + "@@";
}

setup.decorate_keyword = function(keyword) {
	return "@@color:dodgerblue;" + keyword + "@@";
}

setup.decorate_error = function(error) {
	return "@@color:red;ERROR: " + error + "@@";
}

setup.decorate_input = function(wd, input) {
	return wd + "@@color:yellow;" + input + "@@";
}

setup.decorate_tutorial = function(input) {
	return "@@color:pink;" + input + "@@";
}

setup.ReadError = class extends Error {
	constructor(file_name) {
		super("You lack permission to read " + file_name);
		this.name = "ReadError"
	}
}

setup.ReadDirError = class extends Error {
	constructor(dir_name) {
		super("You cannot read Directory " + dir_name);
		this.name = "ReadDirError"
	}
}

setup.EditError = class extends Error {
	constructor(file_name) {
		super("You lack permission to edit " + file_name);
		this.name = "EditError"
	}
}

setup.EditDirError = class extends Error {
	constructor(dir_name) {
		super("You cannot edit Directory " + dir_name);
		this.name = "EditDirError"
	}
}

setup.DuplicateChildError = class extends Error {
	constructor(parent_name, child_name) {
		super(parent_name + " already has child named " + child_name);
		this.name = "DuplicateChildError"
	}
}

setup.FindError = class extends Error {
	constructor(child_name) {
		super(child_name + " does not exist");
		this.name = "FindError"
	}
}

setup.ParentError = class extends Error {
	constructor(child_name) {
		super(child_name + " has no Parent");
		this.name = "ParentError"
	}
}

setup.CDError = class extends Error {
	constructor(child_name) {
		super("Directory " + child_name + " does not exist");
		this.name = "CDError"
	}
}

setup.RMError = class extends Error {
	constructor(file_name) {
		super(file_name + " is system protected and cannot be removed");
		this.name = "RMError"
	}
}

setup.RMSubDirError = class extends Error {
	constructor() {
		super("Cannot remove current directory");
		this.name = "RMSubDirError"
	}
}

setup.CPError = class extends Error {
	constructor(file_name) {
		super(file_name + " is system protected and cannot be copied");
		this.name = "CPError"
	}
}

setup.MVError = class extends Error {
	constructor(file_name) {
		super(file_name + " is system protected and cannot be moved");
		this.name = "MVError"
	}
}

setup.NameError = class extends Error {
	constructor() {
		super("File Name must not contain special characters");
		this.name = "NameError"
	}
}

setup.InvalidCommandError = class extends Error {
	constructor(keyword) {
		super(keyword + " is not a valid command");
		this.name = "InvalidCommandError";
	}
}

setup.InvalidArgNumError = class extends Error {
	constructor() {
		super("Invalid number of arguments provided");
		this.name = "InvalidArgNumError";
	}
}


// Twine doesn't handle inheritance well. File and Directory should inherit 
// from an abstract parent, but it is easier to make two separate classes here.

setup.File = class {
	constructor(name, contents, id) {
		this.name = name;
		this.type = "File";
		this.contents = contents;
		this.permissions = new Map();
		this.permissions.set("delete", false);
		this.permissions.set("visible", true);
		this.permissions.set("copy", false);
		this.permissions.set("edit", false);
		this.permissions.set("read", true);
		this.permissions.set("question", false);
		this.id = id;
	}

	read() {
		if (this.permissions.get("read")) {
			return this.contents;
		} else {
			throw new setup.ReadError(this.name);
		}
	}

	update_contents(new_contents) {
		if (this.permissions.get("edit")) {
			if (new_contents.length > 1000) {
				new_contents = new_contents.slice(0, 1000);
			}
			this.contents = new_contents;
		} else {
			throw new setup.EditError(this.name);
		}
	}

	has_descendant(descendant) {
		return false;
	}

	_init(obj) {
		Object.keys(obj).forEach(function (pn) {
			this[pn] = clone(obj[pn]);
		}, this);
		return this;
	}

    // Required for Twine classes
	clone() {
		return (new setup.File())._init(this);
	}

    // Required for Twine classes
	toJSON() {
		let ownData = {};
		Object.keys(this).forEach(function (pn) {
			ownData[pn] = clone(this[pn]);
		}, this);
		return JSON.reviveWrapper('(new setup.File())._init($ReviveData$)',
			ownData);
	}
}


setup.Directory = class {
	constructor(name, id) {
		this.name = name;
		this.permissions = new Map();
		this.permissions.set("delete", false);
		this.permissions.set("visible", true);
		this.type = "Directory";
		this.children = []
		this.user_at = false;
		this.user_home = false;
		this.id = id;
	}

	set_user_at(updated) {
		this.user_at = updated;
	}

	get_user_at() {
        // Find directory user is at, if it is a child of this directory
		if (this.user_at) {
			return this;
		}
		let to_return;
		this.children.forEach((child) => {
			let child_user_at = child.get_user_at();
			if (child_user_at !== undefined) {
				to_return = child_user_at;
			}
		});
		return to_return;
	}

	get_user_home() {
        // Find user home directory, if it is a child of this directory
		if (this.user_home) {
			return this;
		}
		let to_return;
		this.children.forEach((child) => {
			let child_user_home = child.get_user_home();
			if (child_user_home !== undefined) {
				to_return = child_user_home;
			}
		});
		return to_return;
	}

	set_user_home(updated) {
		this.user_home = updated;
	}

	get_id(id) {
        // Find directory with given ID, if it is a child of this directory
		if (id === this.id) {
			return this;
		}
		let to_return;
		this.children.forEach((child) => {
			let child_id = child.get_id(id);
			if (child_id !== undefined) {
				to_return = child_id;
			}
		});
		return to_return;
	}

	get_subdirs(view_all) {
		let contents = "";
		const curr_line = {content: "", length: 0};
		this.children.forEach((child) => {
			let next;
			if (child.permissions.get("visible") ||
				(!child.permissions.get("visible") && view_all)) {
				next = child.name;
				if (child.type === "File") {
					if (next.length + curr_line.length + 5 <= 80) {
						if (curr_line.content === "") {
							curr_line.content += setup.decorate_file(next);
							curr_line.length += next.length;
						} else {
							curr_line.content += "&nbsp;".repeat(5) + setup.decorate_file(next);
							curr_line.length += 5 + next.length;
						}
					} else {
						contents += curr_line.content + "\n";
						curr_line.content = setup.decorate_file(next);
						curr_line.length = next.length;
					}
				} else if (child.type === "Directory") {
					if (next.length + curr_line.length + 5 <= 80) {
						if (curr_line.content === "") {
							curr_line.content += next;
						curr_line.length += next.length;
						} else {
							curr_line.content += "&nbsp;".repeat(5) + next;
							curr_line.length += 5 + next.length;
						}
					} else {
						contents += curr_line.content + "\n";
						curr_line.content = next;
						curr_line.length = next.length;
					}
				}
			}
		});
		contents += curr_line.content;
		return contents;
	}

	get_child(name) {
        // Return child with given name
		let wanted;
		this.children.forEach((child) => {
			if (setup.equal_ignore_case(child.name, name)) {
				wanted = child;
			}
		});
		if (wanted !== undefined) {
			return wanted;
		}
		throw new setup.FindError(name);
	}

	has_descendant(descendant) {
		if (this.id === descendant.id) {
			return true;
		} else {
			let has_descendant = false;
			this.children.forEach((child) => {
				has_descendant = child.has_descendant(descendant) || has_descendant;
			});
			return has_descendant;
		}
	}

	remove_child = function(to_remove) {
		let new_children = [];
		this.children.forEach((child) => {
			if (!(child.id === to_remove.id)) {
				new_children.push(child);
			}
		});
		this.children = new_children;
	}

	_init(obj) {
		Object.keys(obj).forEach(function (pn) {
			this[pn] = clone(obj[pn]);
		}, this);
		return this;
	}

    // Required for Twine classes
	clone() {
		return (new setup.Directory())._init(this);
	}

    // Required for Twine classes
	toJSON() {
		let ownData = {};
		Object.keys(this).forEach(function (pn) {
			ownData[pn] = clone(this[pn]);
		}, this);
		return JSON.reviveWrapper('(new setup.Directory())._init($ReviveData$)',
			ownData);
	}
}

setup.FileSystem = class {
	constructor(root) {
		this.root = root;
        // Each directory stores its children
        // Backlinks is an array of (child id, parent id) to find parents
        // This is required to avoid backlinks
        // IDs are used rather than pointers to directories, as Twine's deep
        // copying causes the items to become different when modified
		this.backlinks = [];
		this.curr_id = 1; // Root should be created externally with id 0
	}

	get_user_at() {
		return this.root.get_user_at();
	}

	get_user_home() {
		return this.root.get_user_home();
	}

	get_id(id) {
		return this.root.get_id(id);
	}

	link_parent_to_child(parent, new_child) {
		try {
			let existing_child = parent.get_child(new_child.name);
			throw new setup.DuplicateChildError(parent.name, new_child.name);
		} catch (err) {
			if (err.name === "FindError") {} else {
				throw err;
			}
		}
		parent.children.push(new_child);
		this.backlinks.push([new_child.id, parent.id]);
	}

	get_parent(dir) {
		let parent;
		this.backlinks.forEach((pair) => {
			if (pair[0] === dir.id) {
				parent = this.get_id(pair[1]);
			}
		});
		if (parent !== undefined) {
			return parent;
		}
		throw new setup.ParentError(dir.name);
	}

	remove_backlink(to_remove) {
		let new_backlinks = [];
		this.backlinks.forEach((link) => {
			if (to_remove.id !== link[0]) {
				new_backlinks.push(link);
			}
		});
		this.backlinks = new_backlinks;
	}

	pwd(dir) {
		if (this.root.id === dir.id) {
			return "/" + dir.name;
		}
		let parent = this.get_parent(dir);
		return this.pwd(parent) + "/" + dir.name;
	}

	prompt_wd() {
		let user_at = this.get_user_at();
		return user_at.name;
	}

	cd(cd_target) {
		let curr_wd = this.get_user_at();
		if (cd_target.length === 0) {
			return this.get_user_home();
		}
		if (cd_target[0] === "/") {
			cd_target = cd_target.slice(1, cd_target.length);
			curr_wd = this.root;
		}
		let target_split = cd_target.split("/");
		return this.cd_helper(curr_wd, target_split);
	}

	cd_helper(curr_wd, cd_helper_target) {
		if (cd_helper_target.length === 0) {
			return curr_wd;
		}
		let next = cd_helper_target.shift();
		if (next === "" || next === ".") {
			return this.cd_helper(curr_wd, cd_helper_target);
		} else if (next === "..") {
			return this.cd_helper(this.get_parent(curr_wd), cd_helper_target);
		}
		let new_wd;
		try {
			new_wd = curr_wd.get_child(next);
			if (!(new_wd.type === "Directory")) {
				throw new setup.FindError(next);
			}
		} catch (err) {
			if (err.name == "FindError") {
				throw new setup.CDError(next);
			} else {
				throw err;
			}
		}
		return this.cd_helper(new_wd, cd_helper_target);
	}

	ls(ls_target, view_all) {
		let temp = this.cd(ls_target);
		if (temp.type === "Directory") {
			return temp.get_subdirs(view_all);
		} else if (temp.type === "File") {
			return temp.name;
		}
	}

	rm(rm_target) {
		let user_at = this.get_user_at();
		if (rm_target.charAt(rm_target.length - 1) === "/") {
			rm_target = rm_target.slice(0, rm_target.length - 1);
		}
		let split_path = setup.split_path(rm_target);
		rm_target = split_path.path_name;
		let temp = this.cd(rm_target);
		let object_name = split_path.child_name;
		let to_remove = temp.get_child(object_name);
		if (!to_remove.permissions.get("delete")) {
			throw new setup.RMError(object_name);
		}
		if (to_remove.has_descendant(user_at)) {
			throw new setup.RMSubDirError();
		}
		this.rm_helper(to_remove);
	}

	rm_helper(to_remove) {
		let to_remove_parent = this.get_parent(to_remove);
		to_remove_parent.remove_child(to_remove);
		this.remove_backlink(to_remove);
		if (to_remove.type === "Directory") {
			to_remove.children.forEach((child) => {
				this.rm_helper(child);
			});
		}
	}

	cp(cp_target, write_target) {
		if (cp_target.charAt(cp_target.length - 1) === "/") {
			cp_target = cp_target.slice(0, cp_target.length - 1);
		}
		let split_cp_path = setup.split_path(cp_target);
		cp_target = split_cp_path.path_name;
		let cp_temp = this.cd(cp_target);
		let cp_object_name = split_cp_path.child_name;
		let to_copy = cp_temp.get_child(cp_object_name);
		if (!to_copy.permissions.get("copy")) {
			throw new setup.CPError(cp_file_name);
		}

		let split_write_path = setup.split_path(write_target);
		write_target = split_write_path.path_name;
		let write_to = this.cd(write_target);
		let write_object_name = split_write_path.child_name;
		if (write_object_name === "") {
			write_object_name = cp_object_name;
		}

		this.cp_helper(to_copy, write_to, write_object_name);
	}

	cp_helper(to_copy, write_to, write_object_name) {
		if (to_copy.type === "File") {
			let copied = this.add_system_file(write_to, write_object_name, to_copy.contents);
			copied.permissions = clone(to_copy.permissions);
		} else if (to_copy.type === "Directory") {
			let copied = this.add_system_dir(write_to, write_object_name);
			copied.permissions = clone(to_copy.permissions);
			to_copy.children.forEach((child) => {
				this.cp_helper(child, copied, child.name);
			});
		}
	}

	mv(mv_target, write_target) {
		try {
			this.cp(mv_target, write_target);
			this.rm(mv_target);
		} catch (err) {
			if (err.name === "CPError" || err.name === "RMError" ||
				err.name === "RMSubDirError") {
				let mv_file = setup.split_path(mv_target).child_name;
				throw new setup.MVError(mv_file);
			} else {
				throw err;
			}
		}
	}

	add_system_dir(parent, dir_name) {
		let new_dir = new setup.Directory(dir_name, this.curr_id);
		this.curr_id++;
		this.link_parent_to_child(parent, new_dir);
		return new_dir;
	}

	add_hidden_dir(parent, dir_name) {
		let new_dir = this.add_system_dir(parent, dir_name);
		new_dir.permissions.set("visible", false);
		return new_dir;
	}

	add_user_dir(parent, dir_name) {
		let new_dir = this.add_system_dir(parent, dir_name);
		new_dir.permissions.set("copy", true);
		new_dir.permissions.set("delete", true);
		return new_dir;
	}

	add_system_file(parent, file_name, contents) {
		let new_file = new setup.File(file_name, contents, this.curr_id);
		this.curr_id++;
		this.link_parent_to_child(parent, new_file);
		return new_file;
	}

	add_hidden_file(parent, file_name, contents) {
		let new_file = this.add_system_file(parent, file_name, contents);
		new_file.permissions.set("visible", false);
		return new_file;
	}

	add_question_file(parent, file_name) {
		let new_file = this.add_system_file(parent, file_name + ".question", "");
		new_file.permissions.set("question", true);
		new_file.permissions.set("read", false);
		return new_file;
	}

	add_user_file(parent, file_name) {
		let new_file = this.add_system_file(parent, file_name, "");
		new_file.permissions.set("copy", true);
		new_file.permissions.set("delete", true);
		new_file.permissions.set("edit", true);
		return new_file;
	}

	edit_file(path, new_contents) {
		let split_path = setup.split_path(path);
		let dir_path = split_path.path_name;
		let temp = this.cd(dir_path);
		let file_name = split_path.child_name;
		let to_edit = temp.get_child(file_name);
		to_edit.update_contents(new_contents);
	}

	_init(obj) {
		Object.keys(obj).forEach(function (pn) {
			this[pn] = clone(obj[pn]);
		}, this);
		return this;
	}

    // Required for Twine classes
	clone() {
		return (new setup.FileSystem())._init(this);
	}

    // Required for Twine classes
	toJSON() {
		let ownData = {};
		Object.keys(this).forEach(function (pn) {
			ownData[pn] = clone(this[pn]);
		}, this);
		return JSON.reviveWrapper('(new setup.FileSystem())._init($ReviveData$)',
			ownData);
	}
}

setup.split_path = function(path) {
	let full_split = path.split("/");
	if (full_split.length === 1) {
		return {path_name: ".", child_name: full_split[0]}
	}
	let prev_path = full_split.splice(0, full_split.length - 1).join("/");
	let file = full_split[full_split.length - 1];
	return {path_name: prev_path, child_name: file};
}

setup.check_argnum = function(expected, given) {
	if (expected !== given) {
		throw new InvalidArgNumError();
	}
}

setup.man =
	setup.decorate_tutorial("Command ") + "@@color:yellow;pwd@@\n" +
	setup.decorate_tutorial("&nbsp;".repeat(5) + "" +
		"Prints the path from the root to the current directory\n") +
	setup.decorate_tutorial("Command ") + "@@color:yellow;ls [optional: path/to/directory]@@\n" +
	setup.decorate_tutorial("&nbsp;".repeat(5) +
		"Prints the contents of the directory at the given path\n") +
	setup.decorate_tutorial("&nbsp;".repeat(5) +
		"If no path is given, prints the contents of the current directory\n") +
	setup.decorate_tutorial("Command ") + "@@color:yellow;cd [optional: path/to/directory]@@\n" +
	setup.decorate_tutorial("&nbsp;".repeat(5) +
		"Moves the user to the directory at the given path\n") +
	setup.decorate_tutorial("&nbsp;".repeat(5) +
		"If no path is given, moves the user to their home directory\n") +
	setup.decorate_tutorial("Command ") + "@@color:yellow;rm [path/to/object]@@\n" +
	setup.decorate_tutorial("&nbsp;".repeat(5) +
		"Deletes the directory or file at the given path\n") +
	setup.decorate_tutorial("&nbsp;".repeat(5) +
		"If a directory is deleted, all its contents will be deleted\n") +
	setup.decorate_tutorial("Command ") + "@@color:yellow;cp [path/to/file] [path/to/destination]@@\n" +
	setup.decorate_tutorial("&nbsp;".repeat(5) +
		"Copies the file at the given path to the destination path\n") +
	setup.decorate_tutorial("&nbsp;".repeat(5) +
		"If the destination is a directory, the copy takes the original file's name\n") +
	setup.decorate_tutorial("&nbsp;".repeat(5) +
		"If the destination is a non-existent file, the copy takes that name\n") +
	setup.decorate_tutorial("Command ") + "@@color:yellow;mv [path/to/file] [path/to/destination]@@\n" +
	setup.decorate_tutorial("&nbsp;".repeat(5) +
		"Moves the file at the given path to the destination path\n") +
	setup.decorate_tutorial("&nbsp;".repeat(5) +
		"If the destination is a directory, the file is moved into it\n") +
	setup.decorate_tutorial("&nbsp;".repeat(5) +
		"If the destination is a non-existent file, file is moved and renamed to it\n") +
	setup.decorate_tutorial("Command ") + "@@color:yellow;mkdir [directory name]@@\n" +
	setup.decorate_tutorial("&nbsp;".repeat(5) +
		"Creates a new directory with the given name in the current directory\n") +
	setup.decorate_tutorial("Command ") + "@@color:yellow;touch [file name]@@\n" +
	setup.decorate_tutorial("&nbsp;".repeat(5) +
		"Creates a new empty file with the given name in the current directory\n") +
	setup.decorate_tutorial("Command ") + "@@color:yellow;read [path/to/file]@@\n" +
	setup.decorate_tutorial("&nbsp;".repeat(5) +
		"Read the contents of the file at the given path\n") +
	setup.decorate_tutorial("Command ") + "@@color:yellow;edit [path/to/file]@@\n" +
	setup.decorate_tutorial("&nbsp;".repeat(5) +
		"Edit the contents of the file at the given path\n");


setup.process_input = function(fs, input) {
	try {
		input = input.replace(/( )+/, " ").trim().split(" ");
		input[0] = input[0].toLowerCase();
		switch (input[0]) {
			case "pwd":
				setup.check_argnum(0, input.length - 1);
				return {output: fs.pwd(fs.get_user_at()), goto: "command line"};
			case "ls":
				switch (input.length - 1) {
					case 0:
						return {output: fs.ls("./", false),
							goto: "command line"};
					case 1:
						if (input[1] === "-a") {
							return {output: fs.ls("./", true),
								goto: "command line",};
						} else {
							return {output: fs.ls(input[1], false),
								goto: "command line"};
						}
					case 2:
						if (input[1] === "-a") {
							return {output: fs.ls(input[2], true),
								goto: "command line", error: false};
						} else {
							throw new InvalidArgNumError();
						}
					default:
						throw new InvalidArgNumError();
				}
			case "cd":
				switch (input.length - 1) {
					case 0: {
						let old_user_at = fs.get_user_at();
						let new_user_at = fs.cd("");
						old_user_at.set_user_at(false);
						new_user_at.set_user_at(true);
						return {output: "", goto: "command line"};
					}
					case 1: {
						let old_user_at = fs.get_user_at();
						let new_user_at = fs.cd(input[1]);
						old_user_at.set_user_at(false);
						new_user_at.set_user_at(true);
						return {output: "", goto: "command line"};
					}
					default:
						throw new InvalidArgNumError()
				}
			case "rm":
				setup.check_argnum(1, input.length - 1);
				fs.rm(input[1]);
				return {output: "", goto: "command line"};
			case "cp":
				setup.check_argnum(2, input.length - 1);
				fs.cp(input[1], input[2]);
				return {output: "", goto: "command line"};
			case "mv":
				setup.check_argnum(2, input.length - 1);
				fs.mv(input[1], input[2]);
				return {output: "", goto: "command line"};
			case "mkdir": {
				setup.check_argnum(1, input.length - 1);
				let split_path = setup.split_path(input[1]);
				let dir_path = split_path.path_name;
				let parent = fs.cd(dir_path);
				let dir_name = split_path.child_name;
				if (!setup.is_valid_object_name(dir_name)) {
					throw new setup.NameError();
				}
				fs.add_user_dir(parent, dir_name);
				return {output: "", goto: "command line"};
			}
			case "touch": {
				setup.check_argnum(1, input.length - 1);
				let split_path = setup.split_path(input[1]);
				let dir_path = split_path.path_name;
				let parent = fs.cd(dir_path);
				let child_name = split_path.child_name;
				if (!setup.is_valid_object_name(child_name)) {
					throw new setup.NameError();
				}
				fs.add_user_file(parent, child_name, "");
				return {output: "", goto: "command line"};
			}
			case "read": {
				setup.check_argnum(1, input.length - 1);
				let split_path = setup.split_path(input[1]);
				let dir_path = split_path.path_name;
				let temp = fs.cd(dir_path);
				let child_name = split_path.child_name;
				let to_view = temp.get_child(child_name);
				if (to_view.type !== "File") {
					throw new ReadDirError(child_name);
				}
				let contents = to_view.read();
				return {output: contents, goto: "reader", name: to_view.name};
			}
			case "edit": {
				setup.check_argnum(1, input.length - 1);
				let split_path = setup.split_path(input[1]);
				let dir_path = split_path.path_name;
				let temp = fs.cd(dir_path);
				let child_name = split_path.child_name;
				let to_edit = temp.get_child(child_name);
				if (to_edit.type !== "File") {
					throw new EditDirError(child_name);
				}
				if (!to_edit.permissions.get("edit")) {
					throw new setup.EditError(to_edit.name);
				}
				let contents = to_edit.read();
				return {output: contents, goto: "editor", editing: input[1], name: to_edit.name};
			}
			case "man":
				console.log(setup.man)
				return {output: setup.man, goto: "reader", name: "Command Manual"};
			default:
				throw new setup.InvalidCommandError(input[0]);
		}
	} catch (err) {
		return {output: setup.decorate_error(err.message), goto: "command line"};
	}
}
