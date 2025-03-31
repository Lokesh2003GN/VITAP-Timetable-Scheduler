// Wait for the page to fully load (or wait for the div to exist)
const waitForElement = (selector, callback) => {
  const element = document.querySelector(selector);
  if (element) {
    callback(element);
  } else {
    // Try again after a short delay
    setTimeout(() => waitForElement(selector, callback), 500);
  }
};
    // Wait for the timetable container to load before proceeding
    waitForElement("#loadMyFragment", (timeTableDiv) => {

      console.log("Found timetable div!");

      const mutationObserverConfig = { childList: true, subtree: true };

      const timeTableDivObserver = new MutationObserver((mutationsList, observer) => {
        change_time_table(); // Your function to handle updates
      });

      timeTableDivObserver.observe(timeTableDiv, mutationObserverConfig);

    });

function filterRepeated(array) {
  const filtered = [];
  let previous = null;

  for (const item of array) {
    if (item !== previous) {
      filtered.push(item);
      previous = item;
    }
  }

  return filtered;
}

const change_time_table = () => {
  const parent_table = document.getElementById("timeTableStyle");
  if (parent_table === null || parent_table === undefined || parent_table.children.length === 0) return;
  
  const tbody_table = parent_table.children[0];// the first element is the <tbody> with data
  const extractedHeader = extract_header(tbody_table.children);
  const extracted_children = extract_tbody_data(tbody_table.children);
  const merged_data = filterRepeatedColumns(extractedHeader, extracted_children)
  const childrenDataArr = merged_data;
  //displayTableData(extractedHeader, childrenDataArr)
  headerData = [...new Set(extractedHeader)];
  headerData.splice(0, 1);
  const csvData = generateCSV(headerData, childrenDataArr);
  const icsData = generateICSFromCSV(csvData);
  
  addFloatingDraggableButtons(icsData)
  
};


function downloadICSFile(icsData, fileName = "schedule.ics") {  
    const userConfirmed = confirm("Do you need customization in the schedule? Click 'OK' for Yes and 'Cancel' for No.");  
    if (userConfirmed) {  
        const modifiedICS = promptForCourseNames(icsData); // Allow user to modify ICS data  
        if (modifiedICS) {  
            icsData = modifiedICS;  
        }  
    }  

    const blob = new Blob([icsData], { type: "text/calendar" });  

    // Create a temporary anchor element  
    const link = document.createElement("a");  
    link.href = URL.createObjectURL(blob);  
   
    link.download = "schedule.ics";


    // Append the link to the body (optional, for some browser compatibility)  
    document.body.appendChild(link);  

    // Trigger the download  
    link.click();  

    // Clean up by removing the anchor element  
    document.body.removeChild(link);  
    URL.revokeObjectURL(link.href);  
}  

// Function to prompt the user to modify course names in ICS data  
function promptForCourseNames(data) {  
    const newNames = {};  
    const lines = data.trim().split("\n");  
    const newTime = prompt("Reminder before time (in minutes):");  

    const updatedLines = lines.map((line) => {  
        const parts = line.split(",");  
        const updatedParts = parts.map((course) => {  
            // Match and update TRIGGER time  
            const alertMatch = course.match(/TRIGGER:-PT(\d+)M/);  
            if (alertMatch) {  
                course = course.replace(/TRIGGER:-PT\d+M/, `TRIGGER:-PT${newTime}M`);  
            }  

            // Match and update course name  
            const courseNameMatch = course.match(/([A-Z]{3}\d{4})/);  
            if (courseNameMatch) {  
                const originalName = courseNameMatch[0];  
                if (!newNames[originalName]) {  
                    const newName = prompt(  
                        `Edit course name for "${originalName}" (Leave blank to keep unchanged):`,  
                        originalName  
                    );  
                    newNames[originalName] = newName || originalName;  
                }  
                return course.replace(originalName, newNames[originalName]);  
            }  
            return course; // Return unchanged course data  
        });  

        return updatedParts.join(",");  
    });  

    return updatedLines.join("\n");  
}


// Function to create a User Guide popup
function createUserGuidePopup() {
  // Create the modal container
  if (document.getElementById("userGuideModal")) {
    document.getElementById("userGuideModal").remove();
    return; // Exit if the button is already present
  }
  const modal = document.createElement("div");
  modal.id = "userGuideModal";
  modal.style.position = "fixed";
  modal.style.top = "0";
  modal.style.left = "0";
  modal.style.width = "100%";
  modal.style.height = "100%";
  modal.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
  modal.style.display = "flex";
  modal.style.justifyContent = "center";
  modal.style.alignItems = "center";
  modal.style.zIndex = "1000";

  // Create the modal content
  const modalContent = document.createElement("div");
  modalContent.style.backgroundColor = "white";
  modalContent.style.padding = "20px";
  modalContent.style.borderRadius = "8px";
  modalContent.style.maxWidth = "600px";
  modalContent.style.width = "90%";
  modalContent.style.boxShadow = "0 2px 10px rgba(0, 0, 0, 0.2)";

  // Add content to the modal
  modalContent.innerHTML = `
    <h1>User Guide</h1>
    <h3>How to Import Calendar</h3>
    <ol>
      <li>Download the ICS file by clicking the link.</li>
      <li>Go to <a href="https://calendar.google.com" target="_blank">calendar.google.com</a> and log in with your Gmail account.</li>
      <li>Click on the gear icon and go to "Settings".</li>
      <li>Navigate to "Import & Export" options.</li>
      <li>In the "Import" section, click "Select file from your computer" and upload the downloaded ICS file.</li>
      <li>Click "Import" to add the events to your calendar.</li>
      
      <li>Now you can also able add widgets in you phone from Google calander<li>
    </ol>
    <h3>How to Verify Notification Timings</h3>
    <p><strong>Note:</strong> By default, event notifications are set to 30 minutes before the event. Please verify and change it as required:</p>
    <ol>
      <li>In Google Calendar, go to "Settings".</li>
      <li>Select your name under the "Settings for my calendars" menu.</li>
      <li>In the "Event notifications" section, update the timing to suit your needs.</li>
    </ol>
    <h3>How to Delete the Calendar</h3>
    <p>To remove the calendar:</p>
    <ol>
      <li>In the "Settings for my calendars" menu, select your email account.</li>
      <li>Scroll down and look for the "Remove calendar" or "Delete" option.</li>
    </ol>
    <button id="closeUserGuide" style="margin-top: 20px; padding: 10px 20px; background: #007BFF; color: white; border: none; border-radius: 4px; cursor: pointer;">Close</button>
  `;

  modal.appendChild(modalContent);
  document.body.appendChild(modal);

  // Add close functionality
  document.getElementById("closeUserGuide").addEventListener("click", () => {
    modal.remove();
  });
}


function addFloatingDraggableButtons(icsData) {
    // Create a floating container for buttons
    const existingContainer = document.getElementById("floatingButtonsContainer");
    if (existingContainer) {
        existingContainer.remove();
    }
    const floatingContainer = document.createElement("div");
    floatingContainer.id = "floatingButtonsContainer";
    floatingContainer.style.position = "fixed";
    floatingContainer.style.bottom = "50px"; // Initial bottom position
    floatingContainer.style.right = "20px";
    floatingContainer.style.zIndex = "10000";
    floatingContainer.style.padding = "10px";
    floatingContainer.style.borderRadius = "8px";
    floatingContainer.style.background = "rgba(0, 0, 0, 0.7)";
    floatingContainer.style.boxShadow = "0px 4px 10px rgba(0, 0, 0, 0.3)";
    floatingContainer.style.display = "flex";
    floatingContainer.style.gap = "10px";
    floatingContainer.style.cursor = "grab";

    // Add ICS Download button
    const icsButton = document.createElement("button");
    icsButton.textContent = "📅 Download ICS";
    icsButton.className = "btn btn-primary";
    icsButton.style.padding = "10px 15px";
    icsButton.style.borderRadius = "5px";
    icsButton.style.cursor = "pointer";
    icsButton.onclick = () => downloadICSFile(icsData); // Trigger ICS download

    // Add User Guide button
    const guideButton = document.createElement("button");
    guideButton.textContent = "📖 User Guide";
    guideButton.className = "btn btn-success";
    guideButton.style.padding = "10px 15px";
    guideButton.style.borderRadius = "5px";
    guideButton.style.cursor = "pointer";
    guideButton.onclick = createUserGuidePopup;

    // Append buttons to floating container
    floatingContainer.appendChild(icsButton);
    floatingContainer.appendChild(guideButton);
    document.body.appendChild(floatingContainer);

    // Make buttons draggable
    makeDraggable(floatingContainer);

}

function makeDraggable(element) {
    let offsetX, offsetY, isDragging = false;

    element.addEventListener("mousedown", (e) => {
        // Only start dragging if the target is NOT a button or child element
        if (e.target.tagName === "BUTTON") return;

        isDragging = true;
        offsetX = e.clientX - element.getBoundingClientRect().left;
        offsetY = e.clientY - element.getBoundingClientRect().top;
        element.style.cursor = "grabbing";

        // Fix positioning issue when dragging
        element.style.right = "auto";
        element.style.bottom = "auto";
    });

    document.addEventListener("mousemove", (e) => {
        if (!isDragging) return;
        let x = e.clientX - offsetX;
        let y = e.clientY - offsetY;

        // Prevent it from moving off-screen
        x = Math.max(0, Math.min(window.innerWidth - element.offsetWidth, x));
        y = Math.max(0, Math.min(window.innerHeight - element.offsetHeight, y));

        element.style.left = `${x}px`;
        element.style.top = `${y}px`;
    });

    document.addEventListener("mouseup", () => {
        isDragging = false;
        element.style.cursor = "grab";
    });
}
