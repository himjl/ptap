

function update_status_strings(){
    // Update page title 
    var percentage_perf = Math.round(mean(trial_returns)*100*10)/10
    var page_title = subjectname +' ('+percentage_perf.toString()+'%, '+getTimeElapsedString(last_trial_timestamp).toString()+' ago)'
    document.getElementById('page_title').innerHTML = page_title
    // Update page header 
    var title_header = 'liveplot: '+subjectname 
    document.getElementById('title_header').innerHTML = title_header
    // Update plot header 
    var header_string = subjectname+': '+percentage_perf+'%'
    header_string+=' (n='+trial_returns.length+' trials'
    header_string+=', r='+sum(trial_returns)
    header_string+=', '+getTimeElapsedString(unix_start_timestamp)+' since start'
    header_string+=')<br>'
    header_string+='Battery: '+batteryleft+'% ('+batteryused+'%)<br>'
    header_string+='Last trial: '+last_trial_string+' ('+getTimeElapsedString(last_trial_timestamp)+' ago)'

    document.getElementById('chart_header').innerHTML = header_string


}
async function updatePlot(i){

    var window_size = 25 

    var disk_rev = await DIO.get_rev(CURRENT_VIEW['filepath'])
    
    
    if(CURRENT_VIEW['rev'] == disk_rev && i!=0){
        
        console.log(i+ '. Refreshing timestring')

        update_status_strings()
        return 
    }

    console.log(i+'. Updating plot')
    CURRENT_VIEW['rev'] = disk_rev

    
    behavior_json = await DIO.read_textfile(CURRENT_VIEW['filepath'])
    behavior_json = JSON.parse(behavior_json)
    console.log(behavior_json)
    trial_behavior = behavior_json['BEHAVIOR']

    trial_responseGridIndex = trial_behavior['Response_GridIndex']
    if(trial_responseGridIndex == undefined){
        trial_responseGridIndex = trial_behavior['responseGridIndex']
    }
    trial_numberSession = trial_behavior['TrialNumber_Session']
    if (trial_numberSession == undefined){
        trial_numberSession = trial_behavior['trialNumberSession']
    }
    trial_returns = trial_behavior['Return']
    if (trial_returns == undefined){
        trial_returns = trial_behavior['return']
    }
    var smoothed_trial_returns = smooth(trial_returns, window_size)

    // Extract meta info
    subjectname = behavior_json['SESSION']['SubjectID']
    if(subjectname == undefined){
        subjectname = behavior_json['SESSION']['agentID']
    }

    unix_start_timestamp = behavior_json['SESSION']['UnixTimestampAtStart'] // sec
    last_trial_timestamp_delta = behavior_json['BEHAVIOR']['StartTime']
    if(last_trial_timestamp_delta == undefined){
        last_trial_timestamp_delta = behavior_json['BEHAVIOR']['timestamp_FixationOnset']
    }
    last_trial_timestamp_delta = last_trial_timestamp_delta.slice(-1)[0] // sec

    last_trial_timestamp = Math.round(unix_start_timestamp + last_trial_timestamp_delta) // in seconds
    last_trial_string = new Date(last_trial_timestamp).toLocaleTimeString('en-US')


    batteryleft = Math.round(behavior_json['SESSION']['BatteryLDT'].slice(-1)[0][0]*100);
    batteryused = Math.round(batteryleft - behavior_json['SESSION']['BatteryLDT'][0][0]*100);

    if(batteryused >0){
        batteryused = batteryused.toString()
        batteryused = '+'+ batteryused
    }
    else if(batteryused <0){
        batteryused = batteryused.toString()
        batteryused = '-'+ batteryused
    }
    else{
        batteryused = batteryused.toString()
    }
    


    // Update page title 
    update_status_strings()

    
    // Plot dataPerf
    var dataPerf = new google.visualization.DataTable()
    var data_array = []

    for (var j = 0; j<trial_returns.length; j++){
        data_array.push([
            trial_numberSession[j], 
            trial_returns[j], 
            smoothed_trial_returns[j], 
            ]) 
    }

    dataPerf.addColumn('number', 'Session trial number');
    dataPerf.addColumn('number', 'Trial reward');
    dataPerf.addColumn('number', 'Smoothed (n='+window_size+') reward');

    dataPerf.addRows(data_array);
    var options = {
        hAxis: {
          title: 'Session trial number'
        },
        vAxis: {
          title: 'Reward'
        }, 
        
        series:{0:{color:'#80A7DF', type:'scatter', pointSize:4,pointShape:{type:'star',sides:5, dent:0.2}, }, 
                1:{color:'#2580E8', curveType:'function', pointSize:0, type:'line'}}
      };


      var chart = new google.visualization.ComboChart(document.getElementById('chart_div'));
      chart.draw(dataPerf, options);


      // Draw action data 
      var dataAction = new google.visualization.DataTable()
      var action_array = {}


    for (var j = 0; j<trial_responseGridIndex.length; j++){
        var resp = trial_responseGridIndex[j]
        if(action_array[resp] == undefined){
            action_array[resp] = 0
        }
        action_array[resp]+=1
    }

    var action_numtimes = []
    dataAction.addColumn('string', 'Action');
    dataAction.addColumn('number', 'subject choice');
    for(var prop in action_array){
        if(action_array.hasOwnProperty(prop)){
            if(prop == "null"){
                dataAction.addRow([ 'timeout', action_array[prop]])
            }
            else{
                dataAction.addRow(['Grid chosen:'+prop, action_array[prop]])
            }
            console.log(prop, action_array[prop])
            
        }
    }

    var options = {
        title:"Trial outcomes",
        hAxis: {
          title: '# times',
          minValue:'0'
        },
      };

    console.log(action_array)
    var chart = new google.visualization.BarChart(document.getElementById('actionChart_div'));
    chart.draw(dataAction, options);




}


function timeOut(timeout_length){
  return new Promise(
    function(resolve, reject){
      var timeout_reinforcement = 0 
      var timer_return = function(){resolve({
        "x":'timed_out', 
        "y":'timed_out', 
        'timestamp':performance.now(), 
        'reinforcement':timeout_reinforcement, 
        'region_index':'timed_out'})}

      setTimeout(timer_return,timeout_length)
    })
}