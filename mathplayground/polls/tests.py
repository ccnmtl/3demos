from channels.testing import ChannelsLiveServerTestCase
from selenium import webdriver
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.by import By
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service as ChromeService
from webdriver_manager.chrome import ChromeDriverManager
from webdriver_manager.core.utils import ChromeType


class PollTests(ChannelsLiveServerTestCase):
    serve_static = True  # emulate StaticLiveServerTestCase

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        options = Options()

        options.add_argument('--no-sandbox')
        options.add_argument('--headless')
        options.add_argument('--disable-gpu')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--profile-directory=Default')
        options.add_argument('--user-data-dir=~/.config/google-chrome')

        try:
            cdm = ChromeDriverManager(
                chrome_type=ChromeType.CHROMIUM).install()
        except ValueError:
            # Fall back to Chrome
            cdm = ChromeDriverManager().install()

        try:
            cls.driver = webdriver.Chrome(
                service=ChromeService(cdm),
                options=options)
        except:  # noqa
            super().tearDownClass()
            raise

    @classmethod
    def tearDownClass(cls):
        cls.driver.quit()
        super().tearDownClass()

    def test_poll_1(self):
        """
        test_when_chat_message_posted_then_seen_by_everyone_in_same_room
        """
        try:
            self._enter_poll_room(1)

            self._open_new_window()
            self._enter_poll_room(1)

            self._switch_to_window(0)

            WebDriverWait(self.driver, 2).until(
                lambda _:
                'Poll 1' == self._page_title_value,
                'Room not titled Poll 1')
        finally:
            self._close_all_new_windows()

    def test_poll_2(self):
        """
        test_when_chat_message_posted_then_not_seen_by_anyone_in_different_room
        """
        try:
            self._enter_poll_room(1)

            self._open_new_window()
            self._enter_poll_room(2)

            WebDriverWait(self.driver, 2).until(
                lambda _:
                'Poll 2' == self._page_title_value,
                'Room not titled Poll 2')
        finally:
            self._close_all_new_windows()

    # === Utility ===

    def _enter_poll_room(self, poll_id):
        self.driver.get(self.live_server_url + '/polls/{}/'.format(poll_id))
        WebDriverWait(self.driver, 2).until(
            lambda _:
            str(poll_id) in self.driver.current_url)

    def _open_new_window(self):
        self.driver.execute_script('window.open("about:blank", "_blank");')
        self._switch_to_window(-1)

    def _close_all_new_windows(self):
        while len(self.driver.window_handles) > 1:
            self._switch_to_window(-1)
            self.driver.execute_script('window.close();')
        if len(self.driver.window_handles) == 1:
            self._switch_to_window(0)

    def _switch_to_window(self, window_index):
        self.driver.switch_to.window(self.driver.window_handles[window_index])

    def _post_message(self, message):
        ActionChains(self.driver).send_keys(message + '\n').perform()

    @property
    def _page_title_value(self):
        return self.driver.find_element(
            by=By.CSS_SELECTOR, value=".chapterBox>h1").text
