const display = document.getElementById("display");
const themeSwitch = document.getElementById("themeSwitch");

// Insert numbers/operators into the display
function insert(value) {
  if (display.innerText === "0") {
    display.innerText = value;
  } else {
    display.innerText += value;
  }
}

// Clear the display
function clearDisplay() {
  display.innerText = "0";
}

// Calculate the result
function calculate() {
  try {
    display.innerText = eval(display.innerText.replace("×", "*"));
  } catch (e) {
    display.innerText = "Error";
  }
}

// Toggle the sign of the number
function toggleSign() {
  if (display.innerText !== "0") {
    display.innerText = String(-parseFloat(display.innerText));
  }
}

// Dark mode toggle
themeSwitch.addEventListener("change", () => {
  document.documentElement.setAttribute(
    "data-theme",
    themeSwitch.checked ? "dark" : "light"
  );
});
