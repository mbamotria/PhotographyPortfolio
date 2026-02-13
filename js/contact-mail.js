(() => {
  const form = document.getElementById("contact-form");
  if (!form) return;

  const recipient = "mohammedbinahmed007@gmail.com";

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const name = (form.querySelector("#contact-name")?.value || "").trim();
    const email = (form.querySelector("#contact-email")?.value || "").trim();
    const subject = (form.querySelector("#contact-subject")?.value || "").trim();
    const message = (form.querySelector("#contact-message")?.value || "").trim();

    const fullSubject = subject || "Photography Portfolio Inquiry";
    const body = [
      `Name: ${name}`,
      `Email: ${email}`,
      "",
      "Message:",
      message,
    ].join("\n");

    const mailtoUrl = `mailto:${recipient}?subject=${encodeURIComponent(fullSubject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
  });
})();
