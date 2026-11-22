const BOOKING_ENDPOINT = "PASTE_APPS_SCRIPT_WEB_APP_URL_HERE";

(function () {
  var PLACEHOLDER = "PASTE_APPS_SCRIPT_WEB_APP_URL_HERE";
  var TREKS = {
    easy: "Easy Trek (4hr, €35)",
    relax: "Relax Trek (1 day, €60)",
    orangutan: "Orangutan Trek (2D1N, €110)",
    explore: "Explore Trek (3D2N, €155)",
    adventure: "Adventure Trek (4D3N, €240)",
    "adventure-long": "Adventure Long Trek (5D4N, €310)"
  };

  var form = document.getElementById("book-form");
  if (!form) return;

  var status = document.getElementById("book-status");
  var alertBox = document.getElementById("book-alert");
  var submitBtn = document.getElementById("book-submit");
  var dateInput = document.getElementById("date");
  var trekSelect = document.getElementById("trek");
  var busy = null;
  var sending = false;

  function todayIso() {
    var d = new Date();
    var month = String(d.getMonth() + 1);
    var day = String(d.getDate());
    if (month.length < 2) month = "0" + month;
    if (day.length < 2) day = "0" + day;
    return d.getFullYear() + "-" + month + "-" + day;
  }

  function fieldError(id) {
    return document.getElementById(id + "-error");
  }

  function setInvalid(input, message) {
    var error = fieldError(input.id);
    if (message) {
      input.setAttribute("aria-invalid", "true");
      if (error) {
        error.hidden = false;
        error.textContent = message;
      }
      return true;
    }
    input.removeAttribute("aria-invalid");
    if (error) {
      error.hidden = true;
      error.textContent = "";
    }
    return false;
  }

  function dateMessage(value) {
    if (!value) return "Choose a start date.";
    if (value < todayIso()) return "That date has already passed.";
    if (busy && busy[value]) return "That day is already taken. Please choose another.";
    return "";
  }

  function validate(show) {
    var checks = [
      [trekSelect, trekSelect.value ? "" : "Select a trek."],
      [document.getElementById("name"), document.getElementById("name").value.trim() ? "" : "Enter your full name."],
      [document.getElementById("email"), emailMessage(document.getElementById("email").value.trim())],
      [document.getElementById("party"), partyMessage(document.getElementById("party").value)],
      [dateInput, dateMessage(dateInput.value)]
    ];
    var message = document.getElementById("message");
    if (message.value.length > 2000) {
      checks.push([message, "Keep the message under 2000 characters."]);
    } else {
      checks.push([message, ""]);
    }

    var first = null;
    checks.forEach(function (pair) {
      var invalid = show ? setInvalid(pair[0], pair[1]) : !!pair[1];
      if (invalid && !first) first = pair[0];
    });
    return first;
  }

  function emailMessage(value) {
    if (!value) return "Enter your email address.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Enter an email address with a domain name.";
    return "";
  }

  function partyMessage(value) {
    if (!/^\d+$/.test(value)) return "Enter a party size from 1 to 99.";
    var n = Number(value);
    if (n < 1 || n > 99) return "Enter a party size from 1 to 99.";
    return "";
  }

  function clearAlert() {
    alertBox.hidden = true;
    alertBox.replaceChildren();
  }

  function link(href, text) {
    var a = document.createElement("a");
    a.href = href;
    a.textContent = text;
    return a;
  }

  function showAlert(mode, prefill) {
    alertBox.hidden = false;
    alertBox.replaceChildren();
    var p = document.createElement("p");
    if (mode === "ambiguous") {
      p.textContent = "We couldn't confirm delivery from this browser. Check your inbox for our reply before writing again. If it isn't there, use WhatsApp or email.";
    } else {
      p.textContent = "We couldn't send your request. Write to us on WhatsApp or by email and we'll take it from there.";
    }
    alertBox.appendChild(p);

    var contacts = document.createElement("p");
    var wa = "https://wa.me/6285188077037";
    if (prefill) wa += "?text=" + encodeURIComponent(prefill);
    contacts.appendChild(link(wa, "WhatsApp (+62 851-8807-7037)"));
    contacts.appendChild(document.createTextNode(" · "));
    contacts.appendChild(link("mailto:sumatraorangutanhiking@gmail.com", "sumatraorangutanhiking@gmail.com"));
    alertBox.appendChild(contacts);

    if (mode === "ambiguous") {
      var actions = document.createElement("div");
      actions.className = "book-actions";
      var again = document.createElement("button");
      again.type = "button";
      again.className = "btn-outline";
      again.textContent = "Try again";
      again.addEventListener("click", function () {
        sending = false;
        submitBtn.disabled = false;
        submitBtn.textContent = "Send request";
        form.removeAttribute("aria-busy");
        clearAlert();
        submitBtn.focus();
      });
      actions.appendChild(again);
      alertBox.appendChild(actions);
    }
  }

  function payload() {
    return {
      trek: trekSelect.value,
      name: document.getElementById("name").value.trim(),
      email: document.getElementById("email").value.trim(),
      partySize: Number(document.getElementById("party").value),
      date: dateInput.value,
      message: document.getElementById("message").value.trim(),
      website: document.getElementById("website").value
    };
  }

  function prefillText(data) {
    return "Trek request: " + data.trek + ", " + data.date + ", " + data.partySize + " people. Name: " + data.name;
  }

  function showSuccess() {
    form.hidden = true;
    clearAlert();
    status.replaceChildren();
    var heading = document.createElement("h2");
    heading.tabIndex = -1;
    heading.textContent = "Thanks — we'll email you within 24–48h to confirm availability and arrange payment";
    var again = document.createElement("button");
    again.type = "button";
    again.className = "btn-outline";
    again.textContent = "Send another request";
    again.addEventListener("click", function () {
      form.reset();
      dateInput.min = todayIso();
      form.hidden = false;
      status.replaceChildren();
      resetSubmit();
      trekSelect.focus();
    });
    status.appendChild(heading);
    status.appendChild(again);
    heading.focus();
  }

  function resetSubmit() {
    sending = false;
    submitBtn.disabled = false;
    submitBtn.textContent = "Send request";
    form.removeAttribute("aria-busy");
  }

  function endpointReady() {
    return BOOKING_ENDPOINT && BOOKING_ENDPOINT !== PLACEHOLDER && BOOKING_ENDPOINT.indexOf("PASTE_APPS_SCRIPT") === -1;
  }

  dateInput.min = todayIso();

  var requested = new URLSearchParams(window.location.search).get("trek");
  if (requested && TREKS[requested]) {
    trekSelect.value = TREKS[requested];
  }

  dateInput.addEventListener("change", function () {
    setInvalid(dateInput, dateMessage(dateInput.value));
  });

  if (endpointReady()) {
    fetch(BOOKING_ENDPOINT, { method: "GET", redirect: "follow" })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!Array.isArray(data)) return;
        busy = {};
        data.forEach(function (item) {
          if (typeof item === "string" && item.length >= 10) busy[item.slice(0, 10)] = true;
        });
        if (dateInput.value) setInvalid(dateInput, dateMessage(dateInput.value));
      })
      .catch(function () {});
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (sending) return;
    clearAlert();
    var firstInvalid = validate(true);
    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    var data = payload();
    if (!endpointReady()) {
      showAlert("failed", prefillText(data));
      return;
    }

    sending = true;
    submitBtn.disabled = true;
    submitBtn.textContent = "Sending…";
    form.setAttribute("aria-busy", "true");

    fetch(BOOKING_ENDPOINT, {
      method: "POST",
      redirect: "follow",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(data)
    })
      .then(function (res) {
        return res.text().then(function (body) {
          var parsed = null;
          try { parsed = JSON.parse(body); } catch (e) { parsed = null; }
          if (res.ok && parsed && parsed.ok === true) {
            showSuccess();
            return;
          }
          showAlert("failed", prefillText(data));
        });
      })
      .catch(function () {
        showAlert("ambiguous", prefillText(data));
      })
      .then(function () {
        if (form.hidden) return;
        if (!alertBox.hidden && alertBox.querySelector("button")) {
          sending = false;
          form.removeAttribute("aria-busy");
          return;
        }
        resetSubmit();
      });
  });
})();
