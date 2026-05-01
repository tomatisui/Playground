import { expect, test, type Page } from "@playwright/test";

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

async function goToOverviewWithAge(page: Page, ageYears: 5 | 6) {
  const seoulToday = getSeoulDateParts();
  const birthYear = seoulToday.year - ageYears;
  const uniqueSuffix = Date.now().toString().slice(-6);

  await page.goto("/");

  await page.getByTestId("home-start-button").click();
  await page.getByTestId("consent-continue-button").click();

  await page.getByTestId("child-name-input").fill(`테스트-${ageYears}-${uniqueSuffix}`);
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

test("age 5 overview shows M1/M2/M3/M4/M5 and excludes M3-R", async ({ page }) => {
  await goToOverviewWithAge(page, 5);

  for (const moduleCode of ["M1", "M2", "M3", "M4", "M5"]) {
    await expect(page.getByTestId(`overview-module-card-${moduleCode}`)).toBeVisible();
  }
  await expect(page.getByTestId("overview-module-card-M3-R")).toHaveCount(0);
  await expect(page.getByTestId("overview-module-card-M5")).toBeVisible();
});

test("age 6 overview shows M1/M2/M3/M3-R/M4/M5", async ({ page }) => {
  await goToOverviewWithAge(page, 6);

  for (const moduleCode of ["M1", "M2", "M3", "M3-R", "M4", "M5"]) {
    await expect(page.getByTestId(`overview-module-card-${moduleCode}`)).toBeVisible();
  }
  await expect(page.getByTestId("overview-module-card-M5")).toBeVisible();
});
