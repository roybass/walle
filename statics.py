import requests
import time
import sys
import re
import os
import socket
import subprocess
try:
    import ujson as json
except ImportError:
    try:
        import simplejson as json
    except ImportError:
        import json


class Statics:
    def __init__(self):
        self.crestURL = 'https://crest-tq.eveonline.com/'
        self.map_items = {}
        self.regions = []
        self.constellations = []
        self.systems = []
        self.region_items = {}
        self.constellation_items = {}
        self.system_items = {}
        self.server_socket = None
        self.port = 5001
        self.host = '127.0.0.1'

    def update(self):
        try:
            r = requests.get(self.crestURL + 'regions/')
            regions = json.loads(r.content)

            if 'items' in regions:
                for region in regions['items']:
                    r = requests.get(region['href'])
                    region_info = json.loads(r.content)
                    region_constellations = {}

                    for constellation in region_info['constellations']:
                        r = requests.get(constellation['href'])
                        constellation_info = json.loads(r.content)
                        constellation_systems = {}

                        for system in constellation_info['systems']:
                            r = requests.get(system['href'])
                            system_info = json.loads(r.content)
                            system_stargates = {}

                            if len(system_info['stargates']) > 0:
                                for stargate in system_info['stargates']:
                                    r = requests.get(stargate['href'])
                                    stargate_info = json.loads(r.content)
                                    stargate_info['id'] = stargate['id']
                                    system_stargates[stargate['id']] = stargate_info

                                    time.sleep(0.01)
                            else:
                                time.sleep(0.01)

                            system_info['stargates'] = system_stargates
                            constellation_systems[system['id']] = system_info

                        constellation_info['systems'] = constellation_systems
                        region_constellations[constellation['id']] = constellation_info

                    region['constellations'] = region_constellations
                    self.map_items[region['id']] = region

                with open('static/regionItems.json', 'w') as out:
                    json.dump(self.map_items, out)

                self.regions_to_constellations()
                self.regions_to_systems()

            else:
                print "No items found in CREST response"

            print "done"
            exit(0)
        except Exception as e:
            print e
            exit(1)

    def regions_to_constellations(self):
        constellations_items = {}

        for region_id, region in self.map_items.iteritems():
            for constellation_id, constellation in region['constellations'].iteritems():
                constellation['region'] = {}
                constellation['region']['href'] = region['href']
                constellation['region']['name'] = region['name']
                constellation['region']['id'] = region['id']
                constellation['region']['id_str'] = region['id_str']
                constellation['region']['constellations'] = region['constellations'].keys()

                constellations_items[constellation_id] = constellation

        with open('static/constellationItems.json', 'w') as out:
            json.dump(constellations_items, out)

    def regions_to_systems(self):
        systems_items = {}

        for region_id, region in self.map_items.iteritems():
            for constellation_id, constellation in region['constellations'].iteritems():
                constellation['region'] = {}
                constellation['region']['href'] = region['href']
                constellation['region']['name'] = region['name']
                constellation['region']['id'] = region['id']
                constellation['region']['id_str'] = region['id_str']
                constellation['region']['constellations'] = region['constellations'].keys()

                for system_id, system in constellation['systems'].iteritems():
                    system['constellation'] = {}
                    system['constellation']['position'] = constellation['position']
                    system['constellation']['region'] = constellation['region']
                    system['constellation']['name'] = constellation['name']
                    system['constellation']['id'] = constellation_id
                    system['constellation']['id_str'] = str(constellation_id)
                    system['constellation']['systems'] = constellation['systems'].keys()
                    systems_items[system_id] = system

        with open('static/systemItems.json', 'w') as out:
            json.dump(systems_items, out)

    def load(self):
        try:
            f = open("static/regionItems.json", "r")
            self.region_items = json.load(f)

            f = open("static/constellationItems.json", "r")
            self.constellation_items = json.load(f)

            f = open("static/systemItems.json", "r")
            self.system_items = json.load(f)
        except IOError as e:
            print e
            print "Update should be run"

            self.region_items = {}
            self.constellation_items = {}
            self.system_items = {}
        except Exception as e:
            print e
            exit(1)

    def listen(self):
        while True:
            stdin = self.trim(raw_input())

            if stdin != '':
                if stdin == 'exit':
                    break
                else:
                    self.set_inputs(stdin)
                    self.search()

            time.sleep(0.5)

    def sockets(self):
        ref = os.fork()
        if ref == 0:
            self.server_socket = socket.socket()
            self.server_socket.bind((self.host, self.port))
            self.server_socket.listen(5)
            self.load()

            try:
                # print "Listening to socket on {0}:{1}".format(self.host, self.port)
                print "ready"
                while True:
                    conn, addr = self.server_socket.accept()
                    try:
                        data = conn.recv(1024)
                        if not data:
                            break

                        body = self.trim(str(data).split()[-1])
                        if body == 'exit':
                            conn.close()
                            break
                        else:
                            self.set_inputs(body)
                            result = self.search(printing=False)

                            conn.send(result)
                            conn.close()
                    except Exception as e:
                        print e
                        conn.close()

                self.server_socket.close()

            except KeyboardInterrupt:
                self.server_socket.close()
        else:
            exit(0)

    def search(self, printing=True):
        regions = {}
        constellations = {}
        systems = {}
        out = {}

        try:
            for region_id in self.regions:
                if region_id in self.region_items:
                    regions[region_id] = self.region_items[region_id]

            for constellation_id in self.constellations:
                if constellation_id in self.constellation_items:
                    constellations[constellation_id] = self.constellation_items[constellation_id]

            for system_id in self.systems:
                if system_id in self.system_items:
                    systems[system_id] = self.system_items[system_id]

            out['regions'] = regions
            out['constellations'] = constellations
            out['systems'] = systems
            result = json.dumps(out)
            if printing:
                print result

            self.regions = []
            self.constellations = []
            self.systems = []

            return result
        except Exception:
            out['regions'] = {}
            out['constellations'] = {}
            out['systems'] = {}
            result = json.dumps(out)

            if printing:
                print result

            return result

    def set_inputs(self, stdin):
        regions = []
        constellations = []
        systems = []
        argv = stdin.split('|')

        for arg in argv:
            if re.match(r'region=', arg):
                regions = arg.split('=')[1].split(',')
            elif re.match(r'constellation=', arg):
                constellations = arg.split('=')[1].split(',')
            elif re.match(r'system', arg):
                systems = arg.split('=')[1].split(',')

        self.regions = map(self.trim, regions)
        self.constellations = map(self.trim, constellations)
        self.systems = map(self.trim, systems)

    @staticmethod
    def trim(v):
        return v.strip() if v else v

    @staticmethod
    def help():
        print "Update static files : -u"
        print "Start socket listener : -s"
        print "Single direct search : region=1234567|constellation=1234567|system=1234567"
        print "Multiple direct search CLI : null"


def main(argv):
    statics = Statics()

    if len(argv) > 0:
        try:
            regions = []
            constellations = []
            systems = []

            for arg in argv:
                if re.match(r'-h', arg):
                    return statics.help()
                elif re.match(r'-u', arg):
                    return statics.update()
                elif re.match(r'-s', arg):
                    return statics.sockets()
                elif re.match(r'region=', arg):
                    regions = arg.split('=')[1].split(',')
                elif re.match(r'constellation=', arg):
                    constellations = arg.split('=')[1].split(',')
                elif re.match(r'system=', arg):
                    systems = arg.split('=')[1].split(',')
                else:
                    continue

            statics.load()
            statics.regions = map(statics.trim, regions)
            statics.constellations = map(statics.trim, constellations)
            statics.systems = map(statics.trim, systems)

            statics.search()
        except Exception as e:
            print e
            exit(1)
    else:
        statics.listen()

if __name__ == "__main__":
    main(sys.argv[1:])
