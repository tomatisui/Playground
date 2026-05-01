import { expect, test, type Locator, type Page } from "@playwright/test";

const FORBIDDEN_TEXT = [
  "debug",
  "internal",
  "provisional_prototype_content",
  "content_not_final",
  "manifest",
  "module code",
  "phase 2 runtime",
  "prototype",
];

function getSeoulDateParts() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(new Date());

  return {
    year: Number(parts.find((part) => part.type === "year")?.value ?? "0"),
    month: Number(parts.find((part) => part.type === "month")?.value ?? "0"),
    day: Number(parts.find((part) => part.type === "day")?.value ?? "0"),
  };
}

async function expectNoForbiddenText(container: Locator) {
  await expect(container).toBeVisible();
  const text = ((await container.textContent()) ?? "").toLowerCase();

  for (const forbidden of FORBIDDEN_TEXT) {
    expect(text).not.toContain(forbidden);
  }
}

async function createSessionAndGoToOverview(page: Page) {
  const seoulToday = getSeoulDateParts();
  const ageYears = 5;
  const birthYear = seoulToday.year - ageYears;
  const uniqueSuffix = Date.now().toString().slice(-6);

  await page.goto("/");
  await page.getByTestId("home-start-button").click();
  await page.getByTestId("consent-continue-button").click();

  await page.getByTestId("child-name-input").fill(`라벨테스트-${uniqueSuffix}`);
  await page.locator('input[name="guardianName"]').fill(`보호자-${uniqueSuffix}`);
  await page.locator('input[name="guardianPhone"]').fill(`010${uniqueSuffix.padStart(8, "0")}`);
  await page.getByTestId("child-age-selector").selectOption(String(birthYear));
  await page.locator("select").nth(1).selectOption(String(seoulToday.month));
  await page.getByRole("button", { name: String(seoulToday.day), exact: true }).click();
  await page.getByRole("button", { name: "세션 생성 후 오디오 확인으로 이동" }).click();
  await page.getByTestId("audio-check-continue-button").click();

  await expect(page).toHaveURL(/\/session\/[^/]+\/overview$/);
  await expect(page.getByTestId("overview-module-cards")).toBeVisible();
}

async function autoSelectFirstEnabledChoice(
  page: Page,
  testId: "practice-choice-option" | "module-choice-option",
) {
  const choices = page.getByTestId(testId);
  const count = await choices.count();

  for (let index = 0; index < count; index += 1) {
    const choice = choices.nth(index);
    if (await choice.isVisible()) {
      await choice.click();
      return;
    }
  }
}

function getSessionIdFromUrl(page: Page) {
  const match = page.url().match(/\/session\/([^/]+)/);
  return match?.[1] ?? "";
}

test("child-facing screens hide internal/debug/prototype labels", async ({ page }) => {
  await createSessionAndGoToOverview(page);

  await page.getByTestId("overview-module-card-M2").click();
  await expect(page).toHaveURL(/\/session\/[^/]+\/transition\?screen=practice-start&module=M2/);
  await expectNoForbiddenText(page.getByTestId("transition-screen-container"));

  await page.getByTestId("practice-start-button").click();
  await expect(page).toHaveURL(/\/session\/[^/]+\/practice(\?|$)/);
  await expectNoForbiddenText(page.getByTestId("practice-screen-container"));

  const sessionId = getSessionIdFromUrl(page);
  expect(sessionId).toBeTruthy();
  await page.goto(`/session/${sessionId}/module/M2`);
  await expect(page).toHaveURL(/\/session\/[^/]+\/module\/M2$/);
  const moduleContainer = page.getByTestId("module-screen-container");
  await expectNoForbiddenText(moduleContainer);
  await autoSelectFirstEnabledChoice(page, "module-choice-option");
});
