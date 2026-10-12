document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  function showMessage(message, isError = false) {
    messageDiv.textContent = message;
    messageDiv.className = `message ${isError ? "error" : "success"}`;
    messageDiv.classList.remove("hidden");

    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  function createDetail(label, value) {
    const paragraph = document.createElement("p");
    const heading = document.createElement("strong");
    heading.textContent = `${label}:`;
    paragraph.append(heading, ` ${value}`);
    return paragraph;
  }

  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      if (!response.ok) {
        throw new Error("Failed to load activities");
      }
      const activities = await response.json();
      const selectedActivity = activitySelect.value;

      activitiesList.replaceChildren();
      activitySelect.replaceChildren();
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = "-- Select an activity --";
      activitySelect.appendChild(placeholder);

      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;
        const title = document.createElement("h4");
        title.textContent = name;
        activityCard.append(title);
        activityCard.appendChild(createDetail("Description", details.description));
        activityCard.appendChild(createDetail("Schedule", details.schedule));
        activityCard.appendChild(createDetail("Availability", `${spotsLeft} spots left`));

        const participantsHeading = document.createElement("h5");
        participantsHeading.className = "participants-heading";
        participantsHeading.textContent = "Participants";
        activityCard.appendChild(participantsHeading);

        if (details.participants.length === 0) {
          const emptyMessage = document.createElement("p");
          emptyMessage.className = "no-participants";
          emptyMessage.textContent = "No participants yet";
          activityCard.appendChild(emptyMessage);
        } else {
          const participantsList = document.createElement("ul");
          participantsList.className = "participants-list";

          details.participants.forEach((email) => {
            const participant = document.createElement("li");
            participant.className = "participant-row";

            const participantEmail = document.createElement("span");
            participantEmail.className = "participant-email";
            participantEmail.textContent = email;

            const removeButton = document.createElement("button");
            removeButton.type = "button";
            removeButton.className = "participant-remove";
            removeButton.textContent = "×";
            removeButton.title = `Unregister ${email}`;
            removeButton.setAttribute("aria-label", `Unregister ${email} from ${name}`);
            removeButton.addEventListener("click", () => unregisterParticipant(name, email));

            participant.append(participantEmail, removeButton);
            participantsList.appendChild(participant);
          });

          activityCard.appendChild(participantsList);
        }

        activitiesList.appendChild(activityCard);

        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      activitySelect.value = selectedActivity;
    } catch (error) {
      activitiesList.textContent = "Failed to load activities. Please try again later.";
      console.error("Error fetching activities:", error);
    }
  }

  async function unregisterParticipant(activity, email) {
    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        { method: "DELETE" }
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || "Unable to unregister participant");
      }

      await fetchActivities();
      showMessage(result.message);
    } catch (error) {
      showMessage(error.message || "Unable to unregister participant", true);
    }
  }

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || "An error occurred");
      }

      signupForm.reset();
      await fetchActivities();
      showMessage(result.message);
    } catch (error) {
      showMessage(error.message || "Failed to sign up. Please try again.", true);
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
