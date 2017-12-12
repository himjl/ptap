
  var run_manual_setup = await loadStringFromLocalStorage("manualSetupFlag") || 'true'
  var run_manual_setup = (run_manual_setup == 'true') 
  
  
if(run_manual_setup == true){
    subject_filepath_list = await DIO.listdir(SUBJECT_DIRPATH)
    // USER INPUT: get Subject file
    subjectdialog = document.getElementById("subjectID_dialog");
    subjectlistobj = document.getElementById("subjectID_list");
    for (var i=subject_filepath_list.length-1; i>=0; i--){
        var opt = document.createElement('option');
        opt.value = i;
        opt.innerHTML = splitFilename(subject_filepath_list[i]) // subject_filepath_list[i];
        subjectlistobj.appendChild(opt);
    }
    subjectlistobj.addEventListener("change",subjectlist_listener,false);
    subjectdialog.showModal()

    // USER INPUT: get Game file
    experiment_file_list = await DIO.listdir(EXPERIMENT_DIRPATH)
    experiment_dialog = document.getElementById("ExperimentFile_dialog");
    experimentfile_obj = document.getElementById("ExperimentFile_list");
    for (var i=experiment_file_list.length-1; i>=0; i--){
      var opt = document.createElement('option');
      opt.value = i;
      opt.innerHTML = splitFilename(experiment_file_list[i]) // subject_filepath_list[i];
      experimentfile_obj.appendChild(opt);
    }
    experimentfile_obj.addEventListener("change",experimentlist_listener,false);
    experiment_dialog.showModal()
    await ExperimentFile_Promise() // sets SESSION.gameFilePath
    
  }