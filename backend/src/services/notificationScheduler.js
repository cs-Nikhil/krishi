const { runDueNotificationJob } = require("./notificationService");

const DEFAULT_RUN_HOUR = 7;
let schedulerHandle = null;

const getNextRunDelay = (now = new Date()) => {
  const runHour = Number(process.env.DUE_NOTIFICATION_RUN_HOUR || DEFAULT_RUN_HOUR);
  const next = new Date(now);
  next.setHours(Number.isFinite(runHour) ? runHour : DEFAULT_RUN_HOUR, 0, 0, 0);

  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }

  return next.getTime() - now.getTime();
};

const scheduleNext = () => {
  const delay = getNextRunDelay();

  schedulerHandle = setTimeout(async () => {
    try {
      const result = await runDueNotificationJob();
      console.log(
        `Due notification job finished: checked=${result.checked}, created=${result.created}, cycle=${result.cycleDate}`
      );
    } catch (error) {
      console.error("Due notification job failed");
      console.error(error.message);
    } finally {
      scheduleNext();
    }
  }, delay);

  if (typeof schedulerHandle.unref === "function") {
    schedulerHandle.unref();
  }
};

const startDueNotificationScheduler = () => {
  if (process.env.DISABLE_DUE_NOTIFICATION_JOB === "true" || schedulerHandle) {
    return;
  }

  runDueNotificationJob()
    .then((result) => {
      console.log(
        `Due notification startup scan finished: checked=${result.checked}, created=${result.created}, cycle=${result.cycleDate}`
      );
    })
    .catch((error) => {
      console.error("Due notification startup scan failed");
      console.error(error.message);
    });

  scheduleNext();
};

const stopDueNotificationScheduler = () => {
  if (schedulerHandle) {
    clearTimeout(schedulerHandle);
    schedulerHandle = null;
  }
};

module.exports = {
  startDueNotificationScheduler,
  stopDueNotificationScheduler
};
