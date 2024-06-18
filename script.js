ZOHO.CREATOR.init()
    .then(function (data) {

        //   
        var queryParams = ZOHO.CREATOR.UTIL.getQueryParams();
        var maintenance_id = queryParams.maintenance_id;

        const createTable = async (start_date, end_date, site, area) => {

            let conditional_criteria = `Task_Name != "Measure Air Flow" && Task_Name != "Expense Inccurred" && Task_Name != "Measure the Coil Temperature"`;
            if (queryParams.maintenance_id) {
                conditional_criteria += ` && Maintenance_ID == ${maintenance_id}`;
                conditional_criteria += (start_date) ? ` && Date_field == "${start_date} 00:00:00"` : "";
            }
            else {
                conditional_criteria += (start_date && end_date) ? ` && Date_field >= "${start_date}" && Date_field <= "${end_date}"` : "";
            }
            if (site) {
                conditional_criteria += ` && Site == ${site}`;
            }
            if (area) {
                conditional_criteria += ` && Area == "${area}"`;
            }
            const configuration = {
                appName: "smart-joules-app",
                reportName: "All_Maintenance_Scheduler_Task_List_Records",
                criteria: conditional_criteria,
                page: 1,
                pageSize: 200,
            }
            const response = await ZOHO.CREATOR.API.getAllRecords(configuration);
            let recordArr = response.data;
            const maintenanceArr = recordArr.reduce((acc, curr) => {
                if (!acc.includes(curr.Maintenance_ID)) {
                    acc.push(curr.Maintenance_ID);
                }
                return acc;
            }, [])
            recordArr.sort((a, b) => parseFloat(a["S_No"]) - parseFloat(b["S_No"]));
            const area_label = document.querySelector(`#area-name`);
            if (area) {
                area_label.textContent = area;
            }
            else {
                area_label.textContent = recordArr[0].Area;
            }
            const added_user = document.querySelector(`#added-user`);
            user_config = {
                appName: "smart-joules-app",
                reportName: "All_Maintenance_Scheduler_Report",
                criteria: `ID ==  ${recordArr[0].Maintenance_ID}`
            }
            const user_resp = await ZOHO.CREATOR.API.getAllRecords(user_config);
            if (user_resp.code == 3000) {
                added_user.value = user_resp.data[0].Completed_by;
            }
            const area_list = [];
            for (let j = 0; j < maintenanceArr.length; j++) {
                mConfig = {
                    appName: "smart-joules-app",
                    reportName: "All_Maintenance_Scheduler_Report",
                    id: maintenanceArr[j]
                }
                const m_obj = await ZOHO.CREATOR.API.getRecordById(mConfig);
                const m_tr = document.createElement("tr");
                m_tr.innerHTML = `<td colspan="11" class="bg-light text-start fw-bold">${m_obj.data.Title}</td>`;
                document.querySelector("#t-body").appendChild(m_tr);
                const newRecordArr = recordArr.filter(rec => rec.Maintenance_ID == maintenanceArr[j]);

                for (let i = 0; i < newRecordArr.length; i++) {
                    area_list.push(newRecordArr[i].Area);
                    if (newRecordArr[i].Task_Name != "Measure Air Flow" && newRecordArr[i].Task_Name != "Expense Inccurred" && newRecordArr[i].Task_Name != "Inventory Consumption") {

                        function escapeDoubleQuotes(str) {
                            return str.replace(/"/g, '\\"');
                        }
                        const taskChoices = async (taskConfig) => {
                            taskConfig = {
                                appName: "smart-joules-app",
                                reportName: "All_Tasks",
                                criteria: `Task_Name == "${escapeDoubleQuotes(newRecordArr[i].Task_Name)}" && Maintanance_ID == ${newRecordArr[i].Maintenance_Master}`
                            }
                            try {
                                const task_resp = await ZOHO.CREATOR.API.getAllRecords(taskConfig);
                                const choices = task_resp.data[0];
                                return choices.Choices.map(choice => choice.display_value);
                            }
                            catch (err) {
                                // console.log(err);
                                return [];
                            }
                        }
                        const task_choices = await taskChoices();

                        const s_no = i + 1;
                        const tr = document.createElement("tr");
                        tr.className = `table-row`;
                        const audio_file = newRecordArr[i].Audio ? `https://creatorapp.zohopublic.in${newRecordArr[i].Audio}`.replace("api", "publishapi") + `&privatelink=q52rRrGjs3HzqO2GjTB28AvBeqgmKVMkma5HDOUxYwpq1Km45hJaRHn3q6Bukj4m0C1Zgq2gM1xg4wFKvrez60A7x2C7aMFxbO3V` : "";
                        const video_file = newRecordArr[i].Video ? `https://creatorapp.zohopublic.in${newRecordArr[i].Video}`.replace("api", "publishapi") + `&privatelink=q52rRrGjs3HzqO2GjTB28AvBeqgmKVMkma5HDOUxYwpq1Km45hJaRHn3q6Bukj4m0C1Zgq2gM1xg4wFKvrez60A7x2C7aMFxbO3V` : "";
                        let tr_data = `<td>${s_no}
                        <audio class="d-none" id="audioPlayer${i}" controls>
                            <source src="${audio_file}" type="audio/mpeg">
                          </audio>
                        </td>
                            <td class='text-nowrap'>${newRecordArr[i].Date_field.substring(0, 6)}</td>
                            <td class='text-start' style='min-width: 200px;'>${newRecordArr[i].Task_Name} ${newRecordArr[i].Audio ? `<span class="fs-6 cursor-pointer" id="audio-${i}"><i class='bi bi-play-fill'></i></span>` : ""}</td>`;

                        tr_data += `<td class='d-none' id="response-type${i}">${newRecordArr[i].Field_Type.display_value}</td>`;
                        let select_tag = `<td id='resp-opt${i}' id='select' style='min-width: 150px;'><select class='form-select' id='input-reponse${i}'>
                           <option value=null ${(newRecordArr[i].Response_Option.display_value || newRecordArr[i].Response_Option1) ? '' : 'selected'}>Choose</option>`;
                        select_tag += (task_choices.includes("Yes") || newRecordArr[i].Task_Name == "Cleaning of Air Filters") ? `<option value='Yes' ${(newRecordArr[i].Response_Option.display_value === 'Yes') ? 'selected' : (newRecordArr[i].Response_Option1 === 'Yes') ? 'selected' : ''}>Yes</option>` : "";
                        select_tag += (task_choices.includes("No") || newRecordArr[i].Task_Name == "Cleaning of Air Filters") ? `<option value='No' ${(newRecordArr[i].Response_Option.display_value === 'No') ? 'selected' : (newRecordArr[i].Response_Option1 === 'No') ? 'selected' : ''}>No</option>` : "";
                        select_tag += task_choices.includes("Not working") ? `<option value='Not working' ${(newRecordArr[i].Response_Option.display_value == 'Not working' || newRecordArr[i].Response_Option1 === "Not working") ? 'selected' : ''}>Not working</option>` : "";
                        select_tag += task_choices.includes("Alignment correct") ? `<option value='Alignment correct' ${(newRecordArr[i].Response_Option.display_value == 'Alignment correct' || newRecordArr[i].Response_Option1 === "Alignment correct") ? 'selected' : ''}>Alignment correct</option>` : "";
                        select_tag += task_choices.includes("Not working") ? `<option value='Not working' ${(newRecordArr[i].Response_Option.display_value == 'Not working' || newRecordArr[i].Response_Option1 === "Not working") ? 'selected' : ''}>Not working</option>` : "";
                        select_tag += task_choices.includes("Leakage found") ? `<option value='Leakage found' ${(newRecordArr[i].Response_Option.display_value == 'Leakage found' || newRecordArr[i].Response_Option1 === "Leakage found") ? 'selected' : ''}>Leakage found</option>` : "";
                        select_tag += task_choices.includes("Damage") ? `<option value='Damage' ${(newRecordArr[i].Response_Option.display_value == 'Damage' || newRecordArr[i].Response_Option1 === "Damage") ? 'selected' : ''}>Damage</option>` : "";
                        select_tag += task_choices.includes("No provision") ? `<option value='No provision' ${(newRecordArr[i].Response_Option.display_value == 'No provision' || newRecordArr[i].Response_Option1 === "No provision") ? 'selected' : ''}>No provision</option>` : "";
                        select_tag += task_choices.includes("Idle") ? `<option value='Idle' ${(newRecordArr[i].Response_Option.display_value == 'Idle' || newRecordArr[i].Response_Option1 === "Idle") ? 'selected' : ''}>Idle</option>` : "";
                        select_tag += task_choices.includes("Electrical") ? `<option value='Electrical' ${(newRecordArr[i].Response_Option.display_value == 'Electrical' || newRecordArr[i].Response_Option1 === "Electrical") ? 'selected' : ''}>Electrical</option>` : "";
                        select_tag += task_choices.includes("Alignment done") ? `<option value='Alignment done' ${(newRecordArr[i].Response_Option.display_value == 'Alignment done' || newRecordArr[i].Response_Option1 === "Alignment done") ? 'selected' : ''}>Alignment done</option>` : "";
                        select_tag += task_choices.includes("Rotating and valves closed") ? `<option value='Rotating and valves closed' ${(newRecordArr[i].Response_Option.display_value == 'Rotating and valves closed' || newRecordArr[i].Response_Option1 === "Rotating and valves closed") ? 'selected' : ''}>Rotating and valves closed</option>` : "";
                        select_tag += task_choices.includes("Safety") ? `<option value='Safety' ${(newRecordArr[i].Response_Option.display_value == 'Safety' || newRecordArr[i].Response_Option1 === "Safety") ? 'selected' : ''}>Safety</option>` : "";
                        select_tag += task_choices.includes("Already aligned") ? `<option value='Already aligned' ${(newRecordArr[i].Response_Option.display_value == 'Already aligned' || newRecordArr[i].Response_Option1 === "Already aligned") ? 'selected' : ''}>Already aligned</option>` : "";
                        select_tag += task_choices.includes("Cleaned") ? `<option value='Cleaned' ${(newRecordArr[i].Response_Option.display_value == 'Cleaned' || newRecordArr[i].Response_Option1 === "Cleaned") ? 'selected' : ''}>Cleaned</option>` : "";
                        select_tag += task_choices.includes("Okay") ? `<option value='Okay' ${(newRecordArr[i].Response_Option.display_value == 'Okay' || newRecordArr[i].Response_Option1 === "Okay") ? 'selected' : ''}>Okay</option>` : "";
                        select_tag += task_choices.includes("Not working") ? `<option value='Not working' ${(newRecordArr[i].Response_Option.display_value == 'Not working' || newRecordArr[i].Response_Option1 === "Not working") ? 'selected' : ''}>Not working</option>` : "";
                        select_tag += task_choices.includes("Already clean") ? `<option value='Already clean' ${(newRecordArr[i].Response_Option.display_value == 'Already clean' || newRecordArr[i].Response_Option1 === "Already clean") ? 'selected' : ''}>Already clean</option>` : "";
                        select_tag += task_choices.includes("Not Okay") ? `<option value='Not Okay' ${(newRecordArr[i].Response_Option.display_value == 'Not Okay' || newRecordArr[i].Response_Option1 === "Not Okay") ? 'selected' : ''}>Not Okay</option>` : "";
                        select_tag += task_choices.includes("Sealed") ? `<option value='Sealed' ${(newRecordArr[i].Response_Option.display_value == 'Sealed' || newRecordArr[i].Response_Option1 === "Sealed") ? 'selected' : ''}>Sealed</option>` : "";
                        select_tag += task_choices.includes("Insulation damaged") ? `<option value='Insulation damaged' ${(newRecordArr[i].Response_Option.display_value == 'Insulation damaged' || newRecordArr[i].Response_Option1 === "Insulation damaged") ? 'selected' : ''}>Insulation damaged</option>` : "";
                        select_tag += task_choices.includes("Done") ? `<option value='Done' ${(newRecordArr[i].Response_Option.display_value == 'Done' || newRecordArr[i].Response_Option1 === "Done") ? 'selected' : ''}>Done</option>` : "";
                        select_tag += task_choices.includes("No leakage found") ? `<option value='No leakage found' ${(newRecordArr[i].Response_Option.display_value == 'No leakage found' || newRecordArr[i].Response_Option1 === "No leakage found") ? 'selected' : ''}>No leakage found</option>` : "";
                        select_tag += task_choices.includes("Tightened") ? `<option value='Tightened' ${(newRecordArr[i].Response_Option.display_value == 'Tightened' || newRecordArr[i].Response_Option1 === "Tightened") ? 'selected' : ''}>Tightened</option>` : "";
                        select_tag += task_choices.includes("Not Done") ? `<option value='Not Done' ${(newRecordArr[i].Response_Option.display_value == 'Not Done' || newRecordArr[i].Response_Option1 === "Not Done") ? 'selected' : ''}>Not Done</option>` : "";
                        select_tag += task_choices.includes("Working") ? `<option value='Working' ${(newRecordArr[i].Response_Option.display_value == 'Working' || newRecordArr[i].Response_Option1 === "Working") ? 'selected' : ''}>Working</option>` : "";
                        select_tag += task_choices.includes("Already tightened") ? `<option value='Already tightened' ${(newRecordArr[i].Response_Option.display_value == 'Already tightened' || newRecordArr[i].Response_Option1 === "Already tightened") ? 'selected' : ''}>Already tightened</option>` : "";
                        select_tag += task_choices.includes("Not working") ? `<option value='Not working' ${(newRecordArr[i].Response_Option.display_value == 'Not working' || newRecordArr[i].Response_Option1 === "Not working") ? 'selected' : ''}>Not working</option>` : "";
                        select_tag += task_choices.includes("Sufficient") ? `<option value='Sufficient' ${(newRecordArr[i].Response_Option.display_value == 'Sufficient' || newRecordArr[i].Response_Option1 === "Sufficient") ? 'selected' : ''}>Sufficient</option>` : "";
                        select_tag += task_choices.includes("Belt replaced") ? `<option value='Belt replaced' ${(newRecordArr[i].Response_Option.display_value == 'Belt replaced' || newRecordArr[i].Response_Option1 === "Belt replaced") ? 'selected' : ''}>Belt replaced</option>` : "";
                        select_tag += task_choices.includes("Low") ? `<option value='Low' ${(newRecordArr[i].Response_Option.display_value == 'Low' || newRecordArr[i].Response_Option1 === "Low") ? 'selected' : ''}>Low</option>` : "";
                        select_tag += task_choices.includes("No damage found") ? `<option value='No damage found' ${(newRecordArr[i].Response_Option.display_value == 'No damage found' || newRecordArr[i].Response_Option1 === "No damage found") ? 'selected' : ''}>No damage found</option>` : "";
                        select_tag += task_choices.includes("Silt observed") ? `<option value='Silt observed' ${(newRecordArr[i].Response_Option.display_value == 'Silt observed' || newRecordArr[i].Response_Option1 === "Silt observed") ? 'selected' : ''}>Silt observed</option>` : "";
                        select_tag += task_choices.includes("Slippage Observed and Adjusted") ? `<option value='Slippage Observed and Adjusted' ${(newRecordArr[i].Response_Option.display_value == 'Slippage Observed and Adjusted' || newRecordArr[i].Response_Option1 === "Slippage Observed and Adjusted") ? 'selected' : ''}>Slippage Observed and Adjusted</option>` : "";
                        select_tag += task_choices.includes("No silt observed") ? `<option value='No silt observed' ${(newRecordArr[i].Response_Option.display_value == 'No silt observed' || newRecordArr[i].Response_Option1 === "No silt observed") ? 'selected' : ''}>No silt observed</option>` : "";
                        select_tag += task_choices.includes("No Slippage observed") ? `<option value='No Slippage observed' ${(newRecordArr[i].Response_Option.display_value == 'No Slippage observed' || newRecordArr[i].Response_Option1 === "No Slippage observed") ? 'selected' : ''}>No Slippage observed</option>` : "";
                        select_tag += task_choices.includes("Alignment") ? `<option value='Alignment' ${(newRecordArr[i].Response_Option.display_value == 'Alignment' || newRecordArr[i].Response_Option1 === "Alignment") ? 'selected' : ''}>Alignment</option>` : "";
                        select_tag += task_choices.includes("Switch working") ? `<option value='Switch working' ${(newRecordArr[i].Response_Option.display_value == 'Switch working' || newRecordArr[i].Response_Option1 === "Switch working") ? 'selected' : ''}>Switch working</option>` : "";
                        select_tag += task_choices.includes("Any vibration found") ? `<option value='Any vibration found' ${(newRecordArr[i].Response_Option.display_value == 'Any vibration found' || newRecordArr[i].Response_Option1 === "Any vibration found") ? 'selected' : ''}>Any vibration found</option>` : "";
                        select_tag += `</select></td>`;
                        const num_input = `<td id='resp-opt${i}'><input type='number' id='input-reponse${i}' value='${newRecordArr[i].Response_Amount}' class='form-control'></td>`;
                        const text_input = `<td id='resp-opt${i}'><input type='text' id='input-reponse${i}' value='${newRecordArr[i].Response_Text}' class='form-control'></td>`;
                        const response_options = newRecordArr[i].Field_Type.display_value;
                        const resp_type = (response_options == "Multiple Choice" || response_options == "Expense" || response_options == "Consumption") ? select_tag : (response_options == "Number" || response_options == "Meter Reading") ? num_input : (response_options == "Text") ? text_input : "";
                        tr_data = tr_data + resp_type;
                        tr_data += `<td><div class='d-flex'><div class="image-field border border-secondary rounded d-flex justify-content-around align-items-center">
                            <div class="upload text-center cursor-pointer"><label for="img${i}" class="cursor-pointer"><i class="bi bi-image"></i></label><input type="file" id="img${i}" accept="image/*" class="d-none"></div>
                            <div class="capture h-100 text-center cursor-pointer">
                            <label data-bs-toggle="modal" data-bs-target="#capture${i}" class="cursor-pointer"><i class="bi bi-camera-fill cam-open"></i></label>
                            <div class="modal fade" id="capture${i}" tabindex="-1" aria-labelledby="exampleModalLabel" aria-hidden="true">
                               <div class="modal-dialog">
                                 <div class="modal-content">
                                   <div class="modal-header">
                                     <h1 class="modal-title fs-5" id="exampleModalLabel">Camera</h1>
                                     <button type="button" class="btn-close cam-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                   </div>
                                   <div class="modal-body">
                                   <div class="capture-camera">
                               <video id="video${i}" class="vid" index="${i}" playsinline autoplay>Video stream not available.</video>
                             </div>
                                   </div>
                                   <div class="modal-footer">
                                   <canvas id="canvas${i}" class="d-none"></canvas>
                                   <input type="file" class="d-none" id="img-capture${i}">
                                     <button type="button" class="btn btn-secondary cam-close" data-bs-dismiss="modal">Close</button>
                                     <button type="button" class="btn btn-secondary switch">Switch Camera</button>
                                     <button type="button" id="startbutton${i}" data-bs-dismiss="modal" class="btn btn-primary capture">Capture</button>
                                   </div>
                                 </div>
                               </div>
                             </div>
                            </div>
                            <div class="capture h-100 cursor-pointer"><label class="cursor-pointer h-100 d-flex align-items-center" id="clear-file${i}" style="font-size: 10px;"><i class="bi bi-x-square-fill"></i></label></div>
                        </div>${newRecordArr[i].Image_Mandatory == "false" ? `` : `<span class="text-danger fw-bold px-1">*</span>`}</div></td>`;
                        tr_data += `<td><input type='checkbox' id='flag${i}' ${newRecordArr[i].Flags_For_Review == 'true' ? 'checked' : ''} class='form-check-input'></td>`;
                        tr_data += `<td><input type='text' id='remark${i}' class='form-control'></td>`;
                        const img_url = newRecordArr[i].Image ? `https://creatorapp.zohopublic.in${newRecordArr[i].Image}`.replace("api", "publishapi") + `&privatelink=q52rRrGjs3HzqO2GjTB28AvBeqgmKVMkma5HDOUxYwpq1Km45hJaRHn3q6Bukj4m0C1Zgq2gM1xg4wFKvrez60A7x2C7aMFxbO3V` : ``;
                        tr_data += `<td><img src='${img_url}' class='img-tag object-fit-contain rounded border' id='img_prev${i}'></td>`;
                        tr_data += `<td class='d-none'>${newRecordArr[i].ID}</td>`;
                        tr_data += `<td class='d-none'>${newRecordArr[i].Maintenance_ID}</td>`;
                        tr_data += `<td>${newRecordArr[i].Video ? `<i id="vid${i}-icon" class="bi fs-4 text-primary cursor-pointer bi-play-circle-fill" data-bs-toggle="modal" data-bs-target="#video-pop${i}"></i>
                        <div class="modal fade" id="video-pop${i}"  aria-hidden="true" data-bs-backdrop="static">
                          <div class="modal-dialog">
                            <div class="modal-content">
                            <div class="modal-header">
                               <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                              <div class="modal-body">
                                <video class="vid" controls>
                                  <source src="${video_file}" type="video/mp4">
                                </video>
                              </div>
                            </div>
                          </div>
                        </div>`: `<div class="d-none"></div>`}
                        </td>`;
                        tr_data += `<td class="d-none img-man">${newRecordArr[i].Image_Mandatory}</td>`;
                        tr_data += `<td class="d-none flag-choices"></td>`;
                        tr.innerHTML = tr_data;
                        const tbody = document.querySelector("#t-body");
                        tbody.appendChild(tr);
                        const img_obj = document.querySelector(`#img${i}`);
                        const img_capture_obj = document.querySelector(`#img-capture${i}`);
                        const img_tag = document.getElementsByClassName("img-tag")[i];
                        if (newRecordArr[i].Audio) {
                            document.querySelector(`#audio-${i}`).addEventListener("click", () => {
                                const audio = document.querySelector(`#audioPlayer${i}`);
                                const audio_obj = document.querySelector(`#audio-${i}`);
                                if (audio.paused) {
                                    audio.play();
                                    audio_obj.innerHTML = "<i class='bi bi-pause-fill'></i>";
                                } else {
                                    audio.pause();
                                    audio_obj.innerHTML = "<i class='bi bi-play-fill'></i>";

                                }
                            })
                        }

                        document.querySelector(`#clear-file${i}`).addEventListener("click", function () {
                            img_obj.value = '';
                            img_tag.src = '';
                        })

                        img_obj.addEventListener("change", function () {
                            const file = img_obj.files[0];
                            if (file) {
                                const image_url = URL.createObjectURL(file);
                                img_tag.src = image_url;
                                img_capture_obj.value = '';
                                img_capture_obj.src = '';

                            }
                        })

                        img_capture_obj.addEventListener("change", function () {
                            const file = img_capture_obj.files[0];
                            if (file) {
                                const image_url = URL.createObjectURL(file);
                                img_tag.src = image_url;
                                img_obj.value = '';
                                img_obj.src = '';
                            }
                        })
                    }

                }
            }

        }
        createTable("01-Jun-2024","30-Jun-2024",null,"SJPL/F-06/CSU-034/ Pre post OP");

        const queryFilter = () => {
            // const query_date = queryParams.date;
            // const query_start_date = queryParams.start_date;
            // const query_end_date = queryParams.end_date;
            // const filter = queryParams.filter;
            // const site = queryParams.site;
            // const area = queryParams.area;
            // if (query_date) {
            //     const start_date = query_date;
            //     const current_date = query_date;
                // createTable(start_date, current_date);
            // }
            // else if (filter == "true") {
                // createTable((query_start_date != "null" && query_end_date != "null") ? query_start_date : "", (query_start_date != "null" && query_end_date != "null") ? query_end_date : "", (site != "null") ? site : "", (area != "null") ? area : "");
            // }
        }
        
        queryFilter();
        const canva = () => {
            var canvas = document.querySelector("#signature-pad");
            var ctx = canvas.getContext('2d');

            var drawing = false;
            var lastX = 0;
            var lastY = 0;

            canvas.addEventListener('mousedown', function (e) {
                drawing = true;
                lastX = e.offsetX;
                lastY = e.offsetY;
            });

            canvas.addEventListener('mousemove', function (e) {
                if (drawing === true) {
                    drawLine(lastX, lastY, e.offsetX, e.offsetY);
                    lastX = e.offsetX;
                    lastY = e.offsetY;
                }
            });

            canvas.addEventListener('mouseup', function (e) {
                drawing = false;
            });

            function drawLine(x1, y1, x2, y2) {
                ctx.beginPath();
                ctx.strokeStyle = "black";
                ctx.lineWidth = 2;
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
                ctx.closePath();
            }
            const small_obj = document.getElementsByTagName("small")[0];
            if (small_obj) {
                small_obj.addEventListener("click", function () {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                })
            }
        }
        canva();


   const apiTest = async () => {
    const tr = document.querySelectorAll(".table-row")
   }

        const addRecord = async () => {
            const tr = document.querySelectorAll(".table-row");
            const promises = Array.from(tr).map(async (row, i) => {
                const responseElement = document.querySelector(`#resp-opt${i}`).lastChild;
                if (!responseElement || !responseElement.value) return;

                const response = responseElement.value;
                const flag_resp = document.querySelector(`#flag${i}`).checked;
                const resp_option = document.querySelector(`#response-type${i}`).textContent;
                const remark_output = document.querySelector(`#remark${i}`).value || "";

                let choice_id = "";
                if (resp_option === "Multiple Choice") {
                    try {
                        const choiceConfig = {
                            appName: "smart-joules-app",
                            reportName: "All_Maintanance_Task_Db",
                            criteria: `Single_Line == "${response}"`,
                        };
                        const choice_resp = await ZOHO.CREATOR.API.getAllRecords(choiceConfig);
                        choice_id = choice_resp.data[0].ID;
                    } catch (err) {

                        console.error('Error fetching multiple choice response:', err);
                        return;
                    }
                }

                const formData = {
                    "data": {
                        "Remarks": remark_output,
                        "Status": "Completed",
                        "Response_Option": resp_option === "Multiple Choice" ? choice_id : "",
                        "Response_Option1": ["Expense", "Consumption"].includes(resp_option) ? response : "",
                        "Response_Amount": ["Number", "Meter Reading"].includes(resp_option) ? response : "",
                        "Response_Text": resp_option === "Text" ? response : "",
                        "Response_Value": response,
                        "Flags_For_Review": flag_resp,
                    }
                };

                const config = {
                    appName: "smart-joules-app",
                    reportName: "All_Maintenance_Scheduler_Task_List_Records",
                    id: row.children[9].textContent,
                    data: formData,
                };

                return ZOHO.CREATOR.API.updateRecord(config);
            });

            try {
                const results = await Promise.all(promises);
                return results;
            } catch (err) {
                console.error('Error in addRecord:', err);
            }
        };




        const addImage = async () => {
            const trCollection = document.getElementsByClassName("table-row");
            const promises = Array.from(trCollection).map((row, i) => {
                const responseElement = document.querySelector(`#resp-opt${i}`);
                if (!responseElement) return;

                const response = responseElement.lastChild;
                if (!response.value || response.value === "null" || response.value === undefined || response.value === null) return;

                const ret_img = document.querySelector(`#img${i}`);
                const ret_capture_img = document.querySelector(`#img-capture${i}`);
                if (!ret_img && !ret_capture_img) return;

                const task_id = row.children[9].textContent;
                const resp_img_value = ret_img?.files[0] || ret_capture_img?.files[0] || "";
                if (!resp_img_value) return "Invalid Image Format";

                if (!(resp_img_value instanceof Blob)) return "Invalid Image Format";

                const config = {
                    appName: "smart-joules-app",
                    reportName: "All_Maintenance_Scheduler_Task_List_Records",
                    id: task_id,
                    fieldName: "Image",
                    file: resp_img_value,
                };

                return ZOHO.CREATOR.API.uploadFile(config);
            });

            try {
                const results = await Promise.all(promises.filter(p => p));
                return results;
            } catch (err) {
                console.error('Error in addImage:', err);
            }
        };


        let currentCamera = "environment";
        let stream;
        let metadataLoaded = false;

        document.addEventListener("click", (event) => {
            const target_class_list = Array.from(event.target.classList);
            const target_obj = event.target.parentElement;
            if (target_class_list.includes("cam-open")) {
                const video_id = event.target.parentElement.getAttribute("data-bs-target");
                const video_obj = document.querySelector(video_id);
                const video = video_obj.querySelector("video");
                const canvas = video_obj.querySelector("canvas");

                navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: currentCamera
                    }
                })
                    .then((cameraStream) => {
                        video.srcObject = cameraStream;
                        stream = cameraStream;
                        video.addEventListener("loadedmetadata", () => {
                            canvas.width = video.videoWidth;
                            canvas.height = video.videoHeight;
                            metadataLoaded = true;
                        });
                    })
                    .catch((err) => {
                        console.error('Error accessing camera: ' + err);
                    });
                video.setAttribute('playsinline', '');
            } else if (target_class_list.includes("cam-close")) {
                stopCamera();
            } else if (target_class_list.includes("capture")) {

                const canvas = target_obj.querySelector("canvas");
                const video_element = target_obj.parentElement.querySelector("video");
                captureImage(video_element, canvas);
            }
            else if (target_class_list.includes("switch")) {
                const video_element = target_obj.parentElement.querySelector("video");
                switchCamera(video_element);
            }
        });

        const captureImage = (video, canvas) => {
            if (!metadataLoaded) {
                console.error('Video metadata is not yet loaded.');
                return;
            }
            const index_no = video.getAttribute("index");
            const context = canvas.getContext('2d');
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageDataURL = canvas.toDataURL('image/png');
            const capturedImage = document.querySelector(`#img_prev${index_no}`);
            stopCamera();
            capturedImage.src = imageDataURL;
            const imageBlob = dataURItoBlob(imageDataURL);
            const imageFile = new File([imageBlob], 'captured_image.png', { type: 'image/png' });
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(imageFile);
            const image_field = document.querySelector(`#img-capture${index_no}`);
            image_field.files = dataTransfer.files;
        };



        const switchCamera = (video) => {
            currentCamera = (currentCamera === 'user') ? 'environment' : (currentCamera === "environment") ? 'user' : "";
            stopCamera();

            if (currentCamera == "user") {
                video.style.transform = "rotateY(180deg)";
            } else {
                video.style.transform = "rotateY(0deg)";
            }

            navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: currentCamera
                }
            })
                .then(function (cameraStream) {
                    video.srcObject = cameraStream;
                    stream = cameraStream;
                    video.setAttribute('playsinline', '');
                })
                .catch(function (err) {
                    console.error('Error accessing camera: ' + err);
                });
        };

        function stopCamera() {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        }


        const dataURItoBlob = (dataURI) => {
            const byteString = atob(dataURI.split(',')[1]);
            const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
            }
            return new Blob([ab], { type: mimeString });
        };


        const submittedUser = async () => {
            const addedUserElement = document.querySelector("#added-user");
            if (!addedUserElement) return;

            const tableRows = Array.from(document.getElementsByClassName("table-row"));
            const schedulerIds = Array.from(new Set(tableRows.map(row => row.children[10].textContent)));

            const user_name = addedUserElement.value;
            const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

            const today = new Date();
            const current_date = `${today.getDate()}-${months[today.getMonth()].substring(0, 3)}-${today.getFullYear()}`;

            const formData = {
                "data": {
                    "Completed_by": user_name || "",
                    "Completed_On": current_date
                }
            };

            const promises = schedulerIds.map(id => {
                const config = {
                    appName: "smart-joules-app",
                    reportName: "New_Maintenance_Scheduler_Report",
                    id: id,
                    data: formData,
                };

              
                    return ZOHO.CREATOR.API.updateRecord(config);
            });

            try {
                return await Promise.all(promises);
            } catch (err) {
                console.error("Error in submittedUser:", err);
            }
        };





        const count = async () => {
            const table_rows = Array.from(document.getElementsByClassName("table-row"));
            const main_arr = table_rows.map(row => row.children[10].textContent);
            const schedulerArr = [...new Set(main_arr)];
            const promises = schedulerArr.map(async (schedulerId) => {
                try {
                    const countConfig = {
                        appName: "smart-joules-app",
                        reportName: "All_Maintenance_Scheduler_Task_List_Records",
                        criteria: `Maintenance_Scheduler_ID == ${schedulerId}`
                    };
                    const tot_obj = await ZOHO.CREATOR.API.getRecordCount(countConfig);
                    const all_rec_count = tot_obj.result.records_count;

                    const completedConfig = {
                        appName: "smart-joules-app",
                        reportName: "All_Maintenance_Scheduler_Task_List_Records",
                        criteria: `Maintenance_Scheduler_ID == ${schedulerId} && Status == "Completed"`
                    };
                    const complete_obj = await ZOHO.CREATOR.API.getRecordCount(completedConfig);
                    const complete_count = complete_obj.result.records_count;

                    if (all_rec_count !== undefined && complete_count !== undefined) {
                        const formData = {
                            data: {
                                Status: complete_count === all_rec_count ? "Completed" : "Pending",
                                Progress: `${complete_count} / ${all_rec_count}`
                            }
                        };

                        const configStatus = {
                            appName: "smart-joules-app",
                            reportName: "New_Maintenance_Scheduler_Report",
                            id: schedulerId,
                            data: formData,
                        };
                        return ZOHO.CREATOR.API.updateRecord(configStatus);
                    }
                } catch (err) {
                    console.error(`Error processing scheduler ID ${schedulerId}:`, err);
                }
            });

            try {
                const results = await Promise.all(promises.filter(p => p));
                return results;
            } catch (err) {
                console.error('Error in count function:', err);
            }
        };


        const updateSignature = () => {
            if (typeof document.getElementsByClassName !== 'function' ||
                typeof document.getElementById !== 'function' ||
                typeof atob !== 'function' ||
                typeof Promise.all !== 'function') {
                console.error("Browser does not support required functions");
                return;
            }

            const promises = [];
            const table_rows = Array.from(document.getElementsByClassName("table-row"));
            const main_arr = table_rows.map(row => row.children[10].textContent);
            const schedulerArr = [...new Set(main_arr)];

            const dataURLtoBlob = (dataURL) => {
                const [header, data] = dataURL.split(',');
                const byteString = atob(data);
                const mimeString = header.split(':')[1].split(';')[0];
                const ab = new ArrayBuffer(byteString.length);
                const ia = new Uint8Array(ab);
                for (let i = 0; i < byteString.length; i++) {
                    ia[i] = byteString.charCodeAt(i);
                }
                return new Blob([ab], { type: mimeString });
            };

            const canvas = document.getElementById('signature-pad');
            if (!canvas || typeof canvas.toDataURL !== 'function') {
                console.error("Canvas or toDataURL is not supported in this browser");
                return;
            }

            const dataURL = canvas.toDataURL();
            const img_url = dataURLtoBlob(dataURL);

            schedulerArr.forEach(id => {
                const config = {
                    appName: "smart-joules-app",
                    reportName: "New_Maintenance_Scheduler_Report",
                    id,
                    fieldName: "Signature",
                    file: img_url || null,
                };

                
                    return ZOHO.CREATOR.API.uploadFile(config);
            });

            return Promise.all(promises).catch(err => {
                console.error('Error updating signature:', err);
            });
        };



        // Function to start the loader
const loaderStart = () => {
    const wrapper = document.getElementsByClassName("wrapper")[0];
    if (wrapper) wrapper.style.display = "block";
    document.body.style.overflow = "hidden"; 
};

// Function to stop the loader and show a modal alert with a message
const loaderEnd = (msg) => {
    const wrapper = document.getElementsByClassName("wrapper")[0];
    if (wrapper) wrapper.style.display = "none";
    document.body.style.overflow = "auto";
    
    const modalAlert = document.querySelector("#img-mand-alert");
    if (modalAlert) {
        modalAlert.querySelector(".modal-title").textContent = "";
        modalAlert.querySelector(".modal-body").innerHTML = `<span class="fw-bold">${msg}</span>`;
        $('#img-mand-alert').modal('show'); // Assuming jQuery is being used
    }
};

// Function to check mandatory image uploads
const checkMandatory = () => {
    const trArr = document.querySelector("tbody").children;
    let j = -1;
    let x = 0;
    const taskArr = [];

    Array.from(trArr).forEach((row, i) => {
        if (i === 0) return; // Skip the first row if it's a header

        j++;
        const imgMandat = row.querySelector(".img-man").textContent;
        const checkImg2 = document.getElementById(`img_prev${j}`);
        console.log(imgMandat, checkImg2.src);

        if (imgMandat === "true" || imgMandat === true) {
            if (checkImg2.src.includes("creatorapp.zoho.in")) {
                const taskName = row.querySelector("td:nth-child(3)").textContent;
                taskArr.push(taskName);
                x++;
            }
        }
    });

    if (x > 0) {
        const modalAlert = document.querySelector("#img-mand-alert");
        if (modalAlert) {
            modalAlert.querySelector(".modal-body").innerHTML = `<span>${taskArr.join(', ')}</span><br><span>The above tasks are mandatory to upload images</span>`;
            $('#img-mand-alert').modal('show'); // Assuming jQuery is being used
        }
        return true;
    } else {
        return false;
    }
};

// Event listener for the submit button
document.querySelector("#submit-btn").addEventListener("click", async () => {
    const imgMandate = checkMandatory();
    if (!imgMandate) {
        loaderStart();
        try {
            
            const addRecords = await addRecord();
            console.log("Records Added:", addRecords);

            // const addImageResponse = await addImage();
            // console.log("Image Added:", addImageResponse);

            // const addedUser = await submittedUser();
            // console.log("User Submitted:", addedUser);

            // const countRecords = await count();
            // console.log("Count Records:", countRecords);

            // const addSign = await updateSignature();
            // console.log("Signature Added:", addSign);
            
            loaderEnd("Records Successfully Added!");
            // Moved here to indicate success

        } catch (err) {
            loaderEnd(err); // Display error message in modal
        } 
    }
});


        document.querySelector("#go-next").addEventListener("click", () => {
            const user_id = ZOHO.CREATOR.UTIL.getInitParams().loginUser;
            window.parent.location.href = user_id.includes(".in") ? "https://creatorapp.zoho.in/smartjoules/smart-joules-app/#Form:Maintenance_Task_Filter" : "https://smartjoules.zohocreatorportal.in/#Page:Maintenance_Task_Filter";
        })
        // ZC End
    });