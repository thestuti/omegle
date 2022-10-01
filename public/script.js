const socket = io("/");

const conversation = document.querySelector(".conversation");

let alreadyTyping = false;

socket.on("numberOfOnline", (size) => {
  document.querySelector(
    ".online"
  ).innerHTML = `${size.toLocaleString()} online now`;
});

document.querySelector("#start").addEventListener("click", () => {
  socket.emit("start", socket.id);
});

socket.on("searching", (msg) => {
  conversation.innerHTML = `<div class="message">${msg}</div>`;
});

socket.on("chatStart", (msg) => {
  conversation.innerHTML = `<div class="message">${msg}</div>`;

  document.querySelector("#stop").classList.remove("hide");

  document.querySelector("#start").classList.add("hide");

  document.querySelector("#text").disabled = false;

  document.querySelector("#send").disabled = false;
});

document.querySelector(".form").addEventListener("submit", (e) => {
  e.preventDefault();
  submitMessage();
});

document.querySelector("#text").onkeydown = (e) => {
  if (e.keyCode === 13 && !e.shiftKey) {
    e.preventDefault();
    submitMessage();
  }
};

document.querySelector("#text").addEventListener("input", (e) => {
  if (!alreadyTyping) {
    socket.emit("typing", "Stranger is typing...");

    alreadyTyping = true;
  }

  if (e.target.value === "") {
    socket.emit("doneTyping");

    alreadyTyping = false;
  }
});

document.querySelector("#text").addEventListener("blur", () => {
  socket.emit("doneTyping");

  alreadyTyping = false;
});

document.querySelector("#text").addEventListener("click", (e) => {
  if (e.target.value !== "") {
    socket.emit("typing", "Stranger is typing...");

    alreadyTyping = true;
  }
});

socket.on("newMessageToClient", (data) => {
  const notStranger = data.id === socket.id;
  const msg = htmlEncode(data.msg);

  conversation.innerHTML += `
        <div class="chat">
            <span class="${notStranger ? "name blue" : "name red"}">${
    notStranger ? "You: " : "Stranger: "
  } </span>
            <span class="text">${msg}</span>
        </div>
    `;

  conversation.scrollTo(0, conversation.scrollHeight);
});

socket.on("strangerIsTyping", (msg) => {
  conversation.innerHTML +=
    conversation.innerHTML = `<div class="message typing">${msg}</div>`;

  conversation.scrollTo(0, conversation.scrollHeight);
});

socket.on("strangerIsDoneTyping", () => {
  const typing = document.querySelector(".typing");

  if (typing) {
    typing.remove();
  }
});

socket.on("goodBye", (msg) => {
  conversation.innerHTML += `<div class="message">${msg}</div>`;

  reset();
});

document.querySelector("#stop").addEventListener("click", () => {
  document.querySelector("#stop").classList.add("hide");

  document.querySelector("#really").classList.remove("hide");
});

document.querySelector("#really").addEventListener("click", () => {
  // stop conversation
  socket.emit("stop");
});

socket.on("strangerDisconnected", (msg) => {
  conversation.innerHTML += `<div class="message">${msg}</div>`;

  reset();
});

socket.on("endChat", (msg) => {
  conversation.innerHTML += `<div class="message">${msg}</div>`;

  reset();
});

function submitMessage() {
  const input = document.querySelector("#text");

  if (/\S/.test(input.value)) {
    socket.emit("doneTyping");

    socket.emit("newMessageToServer", input.value);

    input.value = "";

    alreadyTyping = false;
  }
}

function reset() {
  document.querySelector("#start").classList.remove("hide");

  document.querySelector("#stop").classList.add("hide");

  document.querySelector("#really").classList.add("hide");

  const text = document.querySelector("#text");

  text.disabled = true;

  text.value = "";

  document.querySelector("#send").disabled = true;

  const typing = document.querySelector(".typing");

  if (typing) {
    typing.remove();
  }

  alreadyTyping = false;

  conversation.scrollTo(0, conversation.scrollHeight);
}

function htmlEncode(str) {
  return String(str).replace(/[^\w. ]/gi, function (c) {
    return "&#" + c.charCodeAt(0) + ";";
  });
}
