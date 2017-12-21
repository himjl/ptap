class ImageBuffer { 
	// This object downloads, caches, and gives out images based on their filenames. 
	// Nothing else. No labels, no grouping, nothing. Just images and their filenames. 

	// Single buffer for now for finite list of images that can completely fit in device RAM. 
	// Construct with image_source (directory string or list of directory strings) and all_filenames ([first to download, last to download])

	// Todo: double buffer to serve imagelists > device RAM (basically, set upper limit on size of cache)
	//														and then flush cache as needed) 
	// Todo: make this Dropbox independent - make this usable with local disk, or in-lab server, for example
	// Todo:  

constructor(DIO){
	// future: some "generator" object that can take queries 
	
	// Buffer: 
	this.DIO = DIO 

	this.cache_dict = {}; // image_path:image_actual
	this.cache_members = []; // earliest image_path -> latest image_path 
	// Todo: double buffer. Currently do not do anything.
	this.num_elements_in_cache = 0; // tracking variable
	this.max_buffer_size = 100; // (for now, arbitrary) number of unique images to keep in buffer
}


// ------- Image blob getting functions ----------------------------
async get_by_name(filename){
	if(filename == 'dot'){
		return filename
	}

	try{
		// Requested image not in buffer. Add it, then return. 
		if (filename in this.cache_dict){
			return this.cache_dict[filename]
		}
		else if (!(filename in this.cache_dict)){
			await this.cache_these_images(filename)
			return this.cache_dict[filename]
		}

	}
	catch(error){
		console.error("get_by_name failed with error:", error)
	}
}

// ------- Buffer-related functions --------------------------------
// Add specific image, or list of images, to cache before moving on.
async remove_image_from_cache(filename){
	window.URL.revokeObjectURL(this.cache_dict[filename].src)
	delete this.cache_dict[filename];
	return
}

async clear_cache(){
	return
}

async cache_these_images(imagenames){
	//console.log('at cache_these_images')
	//console.log(imagenames)
	var numRequestedImages = 0
	var lockedImageNames = [] // Requested imagenames that are currently in cache 
	try{

		if (typeof(imagenames) == "string"){
			var filename = imagenames; 

			if (!(filename in this.cache_dict)){
				var image = await this.DIO.load_image(filename); 
				this.cache_dict[filename] = image; 
				this.cache_members.push(filename)
				numRequestedImages++
				//this.num_elements_in_cache++
			}
			else{
				lockedImageNames.push(filename)
			}
		}

		
		else if (typeof(imagenames) == "object"){
			var requested_imagenames = []
			for (var i = 0; i < imagenames.length; i ++){
				var filename = imagenames[i]
				if(!(filename in this.cache_dict) && (requested_imagenames.indexOf(filename) == -1)){
					requested_imagenames.push(filename)
				}
				else if(requested_imagenames.indexOf(filename) != -1){
					//console.log('image already requested')
					continue 
				}
				else if(filename in this.cache_dict){
					//console.log('image already cached')
					lockedImageNames.push(filename)
					continue
				}
			}
			var image_array = await this._loadImageArray(requested_imagenames)
			for (var i = 0; i < image_array.length; i++){
				this.cache_dict[requested_imagenames[i]] = image_array[i]; 
				this.cache_members.push(requested_imagenames[i])
				numRequestedImages++ //this.num_elements_in_cache++; 
			}
		}

		
	
		if(numRequestedImages > this.max_buffer_size){
			this.max_buffer_size = numRequestedImages
		}

		this.num_elements_in_cache += numRequestedImages
		if (this.num_elements_in_cache > this.max_buffer_size){

			console.log('Exceeded max buffer size: '+this.num_elements_in_cache+'/'+this.max_buffer_size)
			// Get delete pool 

			// Remove oldest entries that are not locked 

			var overflowAmount = this.num_elements_in_cache - this.max_buffer_size
			var numDeletableOldEntries = Math.max(0, this.max_buffer_size - (numRequestedImages - overflowAmount))
			numDeletableOldEntries  = Math.max(Math.floor(numDeletableOldEntries/2), numRequestedImages) // Delete half of deletable

			// Iterate over first deletableOldEntries and delete the ones that are not locked
			var deletePromiseArray = []
			var numDeleted = 0
			for (var j = 0; j<numDeletableOldEntries; j++){
				if (lockedImageNames.indexOf(this.cache_members[j]) == -1){
					deletePromiseArray.push(this.remove_image_from_cache(this.cache_members[j]))
					numDeleted = numDeleted+1
				}
				else{
					console.log('skipped deletion of ',j,  this.cache_members[j])
				}
			}

			Promise.all(deletePromiseArray) // Not blocking

			this.cache_members = this.cache_members.slice(numDeletableOldEntries)
			this.cache_members.push(...lockedImageNames) // Push locked images to end of queue
			this.num_elements_in_cache = this.num_elements_in_cache-numDeleted


			// todo: don't delete entries that were just requested
		}

	}
	catch(error){
		console.error("cache_these_images failed with error:", error)
	}
}

async _loadImageArray(imagepathlist){
		try{
			var MAX_SIMULTANEOUS_REQUESTS = 500 // Empirically chosen based on our guess of Dropbox API's download request limit in a "short" amount of time.
			var MAX_TOTAL_REQUESTS = 3000 // Empirically chosen

			if (imagepathlist.length > MAX_TOTAL_REQUESTS) {
				throw "Under the Dropbox API, cannot load more than "+MAX_TOTAL_REQUESTS+" images at a short time period. You have requested "
				+imagepathlist.length+". Consider using an image loading strategy that reduces the request rate on Dropbox."
				return 
			}

			if (imagepathlist.length > MAX_SIMULTANEOUS_REQUESTS){
				console.log('Chunking your '+ imagepathlist.length+' image requests into '+Math.ceil(imagepathlist.length / MAX_SIMULTANEOUS_REQUESTS)+' chunks of (up to) '+MAX_SIMULTANEOUS_REQUESTS+' each. ')
				var image_array = []

				for (var i = 0; i < Math.ceil(imagepathlist.length / MAX_SIMULTANEOUS_REQUESTS); i++){

					var lb = i*MAX_SIMULTANEOUS_REQUESTS; 
					var ub = i*MAX_SIMULTANEOUS_REQUESTS + MAX_SIMULTANEOUS_REQUESTS; 
					var partial_pathlist = imagepathlist.slice(lb, ub);

					// var partial_image_requests = partial_pathlist.map(loadImagefromDropbox);
					var partial_image_requests = []
					for (var j = 0; j<partial_pathlist.length; j++){
						partial_image_requests.push(this.DIO.load_image(partial_pathlist[j]))
					}

					var partial_image_array = await Promise.all(partial_image_requests)
					image_array.push(... partial_image_array); 
				}
				
			}
			else { 
				var image_requests = imagepathlist.map(this.DIO.load_image); 
				var image_array = await Promise.all(image_requests)
			}
			return image_array
		}
		catch(err){
			console.log(err)
		}

	}

}